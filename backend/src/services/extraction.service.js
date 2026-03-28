const env = require("../config/env");
const { preprocessText } = require("../utils/normalization");
const { validateOutput } = require("./validation.service");
const {
  normalizeHindiNumbers,
  normalizeDevanagariNumerals,
  normalizeHindiItems,
  normalizeHindiText,
  detectHindiTransactionIntent,
  isHindiContent,
  isHinglish,
  detectLanguageStyle,
} = require("./hindi-normalization.service");
const {
  applyInferences,
  canInferAndAccept,
  buildConfirmationMessage,
  buildConfirmationPrompt,
  adjustConfidenceForInference,
} = require("./inference.service");

/**
 * FIXED: Proper language detection that supports Hindi, Hinglish, and English
 * Returns: "hindi" | "hinglish" | "english"
 */
function detectResponseLanguage(text) {
  return detectLanguageStyle(text);
}

function getClarificationMessage(language) {
  if (language === "marathi") {
    return "कृपया व्यवहार थोडा स्पष्ट सांगाल का? कोणती वस्तू, किती प्रमाण, आणि किती रक्कम होती ते कृपया सांगा.";
  }

  if (language === "hinglish") {
    return "Kripya transaction thoda clearly batayiye. Kaunsi item thi, kitni quantity thi, aur kitna amount tha?";
  }

  return "Could you please restate the transaction clearly with item, quantity, price, and expense amount?";
}

function makeRespectfulClarification(question, language) {
  const fallback = getClarificationMessage(language);
  const value = String(question || "").trim();

  if (!value) {
    return fallback;
  }

  if (language === "marathi") {
    if (/^0 .*काय मतलब/i.test(value) || /^0 .*काय/i.test(value)) {
      return "कृपया सांगाल का, येथे प्रमाण 0 आहे का, की काही वेगळा अर्थ अभिप्रेत आहे?";
    }

    return value;
  }

  if (language === "hinglish") {
    if (/^0 .*kya matlab/i.test(value) || /\bkya matlab hai\?/i.test(value)) {
      return "Kripya batayiye, yahan quantity 0 hai ya aapka kuch aur matlab tha?";
    }

    if (!/kripya|please|kindly/i.test(value)) {
      return `Kripya batayiye, ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
    }

    return value;
  }

  if (/^0 .*what does/i.test(value)) {
    return "Could you please clarify whether the quantity is 0 here, or whether you meant something else?";
  }

  if (!/please|could you|kindly/i.test(value)) {
    return `Could you please clarify: ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
  }

  return value;
}

function createEmptyResponse(language, llmError = null) {
  return {
    sales: [],
    expenses: [],
    meta: {
      confidence: 0.1,
      source: "fallback",
      needs_clarification: true,
      clarification_question: getClarificationMessage(language),
    },
    debug: {
      llm_attempted: false,
      llm_succeeded: false,
      llm_used_live_response: false,
      llm_error: llmError,
    },
  };
}

function mergeDuplicates(data) {
  const salesMap = new Map();
  const expensesMap = new Map();

  for (const sale of data.sales || []) {
    const key = `${sale.item}:${sale.price}`;
    const existing = salesMap.get(key);
    if (existing) {
      existing.qty += sale.qty;
    } else {
      salesMap.set(key, { ...sale });
    }
  }

  for (const expense of data.expenses || []) {
    const existing = expensesMap.get(expense.item);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      expensesMap.set(expense.item, { ...expense });
    }
  }

  return {
    ...data,
    sales: Array.from(salesMap.values()),
    expenses: Array.from(expensesMap.values()),
  };
}

function reconcileExplicitPrices(text, data) {
  const explicitSales = [];
  const regex = /(\d+)\s*([a-z]+)\s*(\d+)(?:\s*ka)?/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    explicitSales.push({
      qty: Number(match[1]),
      item: match[2].trim(),
      price: Number(match[3]),
    });
  }

  if (!explicitSales.length) {
    return data;
  }

  const reconciledSales = (data.sales || []).map((sale) => {
    const explicitMatch = explicitSales.find(
      (entry) => entry.item === sale.item && entry.qty === sale.qty
    );

    if (!explicitMatch) {
      return sale;
    }

    return {
      ...sale,
      price: explicitMatch.price,
    };
  });

  return {
    ...data,
    sales: reconciledSales,
  };
}

function detectAmbiguity(text, data) {
  const language = detectResponseLanguage(text);
  const hasData = (data.sales?.length || 0) + (data.expenses?.length || 0) > 0;
  const normalizedText = String(text || "").toLowerCase();
  const mentionsSale = /\b(becha|bika|biki|sold|sale|sales|bikri)\b/i.test(normalizedText);
  const mentionsExpense = /\b(kharida|kharidi|expense|kharcha|paid|pay|rent|transport|cost)\b/i.test(normalizedText);
  const hasSales = (data.sales?.length || 0) > 0;
  const hasExpenses = (data.expenses?.length || 0) > 0;
  const suspiciousNumbers = /\b\d{4,}\s*hazar\b/i.test(normalizedText);

  if (!hasData) {
    return {
      ambiguous: true,
      clarification_question: getClarificationMessage(language),
    };
  }

  if (data.meta?.needs_clarification) {
    return {
      ambiguous: true,
      clarification_question: makeRespectfulClarification(
        data.meta.clarification_question,
        language
      ),
    };
  }

  if ((mentionsSale && !hasSales) || (mentionsExpense && !hasExpenses) || suspiciousNumbers) {
    return {
      ambiguous: true,
      clarification_question: getClarificationMessage(language),
    };
  }

  return {
    ambiguous: false,
    clarification_question: null,
  };
}

/**
 * FIXED: Improved confidence computation
 * Logic:
 * - If data is complete (no clarification needed) → 0.85+
 * - If data partial but has required fields (qty + price + item) → 0.70+
 * - If ambiguous but LLM attempted → 0.55+
 * - If extraction failed → 0.2
 */
function computeConfidence(data, source) {
  const sales = data.sales || [];
  const expenses = data.expenses || [];
  const totalItems = sales.length + expenses.length;
  const needsClarification = data.meta?.needs_clarification;

  // No structured data found
  if (totalItems === 0) {
    return 0.2;
  }

  // Check if all required fields are present
  const hasSalesWithData = sales.every((s) => s.item && s.qty > 0 && s.price > 0);
  const hasExpensesWithData = expenses.every((e) => e.item && e.amount > 0);
  const dataIsComplete = hasSalesWithData && hasExpensesWithData;

  if (dataIsComplete && !needsClarification) {
    // Full confidence: all fields present and unambiguous
    return source === "llm" ? 0.92 : 0.85;
  }

  if (dataIsComplete && needsClarification) {
    // High confidence but needs user confirmation
    return source === "llm" ? 0.80 : 0.75;
  }

  if (totalItems > 0) {
    // Partial data present
    return source === "llm" ? 0.70 : 0.65;
  }

  return 0.3;
}

const EXPENSE_KEYWORDS = new Set([
  "transport",
  "rent",
  "gas",
  "diesel",
  "petrol",
  "milk",
  "doodh",
  "expense",
  "kharcha",
  "helper",
  "salary",
  "wages",
  "utilities",
  "raw",
  "material",
]);

function normalizeItemToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "")
    .trim();
}

function extractRuleSales(segment) {
  const salePattern = /(\d+)\s+([\p{L}\p{M}]+)\s+(\d+)\s*(?:ka|ki|ke|का|की|के|rs|rupees?|₹)?/giu;
  const salePatternVerbFirst = /(?:sold|becha|bechi|beche|bika|bike|biki|बेचा|बेची|बेचे)\s+(\d+)\s+([\p{L}\p{M}]+)(?:\s+(?:at|for|ka|ki|ke))?\s+(\d+)/giu;
  const sales = [];
  let match;

  while ((match = salePattern.exec(segment)) !== null) {
    const qty = Number(match[1]);
    const item = normalizeItemToken(match[2]);
    const price = Number(match[3]);

    if (!qty || !item || !price) {
      continue;
    }

    sales.push({ item, qty, price });
  }

  while ((match = salePatternVerbFirst.exec(segment)) !== null) {
    const qty = Number(match[1]);
    const item = normalizeItemToken(match[2]);
    const totalOrPrice = Number(match[3]);

    if (!qty || !item || !totalOrPrice) {
      continue;
    }

    const price = Math.max(1, Math.round(totalOrPrice / qty));
    sales.push({ item, qty, price });
  }

  return sales;
}

function extractRuleExpenses(segment) {
  const expenses = [];
  const normalized = String(segment || "").toLowerCase();

  const amountFirstPattern = /(\d+)\s*(?:ka|ki|ke)?\s+([\p{L}\p{M}]+)/giu;
  let amountFirst;
  while ((amountFirst = amountFirstPattern.exec(segment)) !== null) {
    const amount = Number(amountFirst[1]);
    const item = normalizeItemToken(amountFirst[2]);
    if (!amount || !item) {
      continue;
    }

    if (
      normalized.includes("khar") ||
      normalized.includes("खरी") ||
      normalized.includes("paid") ||
      normalized.includes("liya") ||
      EXPENSE_KEYWORDS.has(item)
    ) {
      expenses.push({ item, amount });
    }
  }

  const itemFirstPattern = /([\p{L}\p{M}]+)\s+(\d+)/giu;
  let itemFirst;
  while ((itemFirst = itemFirstPattern.exec(segment)) !== null) {
    const item = normalizeItemToken(itemFirst[1]);
    const amount = Number(itemFirst[2]);
    if (!amount || !item || !EXPENSE_KEYWORDS.has(item)) {
      continue;
    }
    expenses.push({ item, amount });
  }

  const amountItemVerbPattern = /(\d+)\s+(?:रुपये|रुपया|rs|rupees?)?\s*([\p{L}\p{M}]+)\s+(?:kharida|kharidi|खरीदा|खरीदी|liya|bought)/giu;
  let amountItemVerb;
  while ((amountItemVerb = amountItemVerbPattern.exec(segment)) !== null) {
    const amount = Number(amountItemVerb[1]);
    const item = normalizeItemToken(amountItemVerb[2]);

    if (!amount || !item) {
      continue;
    }

    expenses.push({ item, amount });
  }

  return expenses;
}

function ruleBasedExtractionSync(text) {
  const responseLanguage = detectResponseLanguage(text);
  const normalizedText = preprocessText(text);
  const segments = normalizedText
    .split(/,|\.|\band\b|\baur\b|और/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  const sales = [];
  const expenses = [];

  for (const segment of segments) {
    const normalizedSegment = segment.toLowerCase();
    const saleIntent = /\b(becha|beche|bechi|bika|biki|bike|sold|sale|sales|bikri|बेचा|बेचे|बेची|बिका|बिकी)\b/i.test(
      normalizedSegment
    );
    const expenseIntent = /\b(kharida|kharidi|kharcha|paid|pay|liya|expense|rent|transport|cost|खरीदा|खरीदी|खर्च)\b/i.test(
      normalizedSegment
    );

    if (saleIntent || !expenseIntent) {
      sales.push(...extractRuleSales(segment));
    }

    if (expenseIntent || /\b(rent|transport|doodh|milk|gas|diesel|petrol)\b/i.test(normalizedSegment)) {
      expenses.push(...extractRuleExpenses(segment));
    }
  }

  const hasData = sales.length + expenses.length > 0;
  return {
    sales,
    expenses,
    meta: {
      source: "rules",
      needs_clarification: !hasData,
      clarification_question: !hasData
        ? getClarificationMessage(responseLanguage)
        : null,
    },
    debug: {
      llm_attempted: false,
      llm_succeeded: false,
      llm_used_live_response: false,
      llm_error: null,
    },
  };
}

/**
 * FIXED: Multi-model LLM fallback with improved prompt
 * - Tries Gemini first
 * - Falls back to Groq if Gemini fails
 * - Includes Hindi, Hinglish, and English examples
 * - Forces strict JSON output
 */
async function callLlmFallback(text) {
  const responseLanguage = detectResponseLanguage(text);

  // IMPROVED PROMPT with multilingual examples
  const improvedPrompt = buildExtractorPrompt(text, responseLanguage);

  // Try Gemini first
  if (env.geminiApiKey) {
    const geminiResult = await tryGeminiExtraction(improvedPrompt, responseLanguage);
    if (geminiResult) return geminiResult;
  }

  // Fallback to Groq if Gemini fails or is unavailable
  if (env.groqApiKey) {
    const groqResult = await tryGroqExtraction(improvedPrompt, responseLanguage);
    if (groqResult) return groqResult;
  }

  // Fallback to OpenAI if both Gemini and Groq fail
  if (env.openaiApiKey) {
    const openaiResult = await tryOpenAIExtraction(improvedPrompt, responseLanguage);
    if (openaiResult) return openaiResult;
  }

  // All LLMs failed
  return {
    ...createEmptyResponse(responseLanguage, "all_llms_failed"),
    debug: {
      llm_attempted: true,
      llm_succeeded: false,
      llm_used_live_response: false,
      llm_error: "all_llms_failed",
    },
  };
}

/**
 * Build improved extraction prompt with multilingual examples
 */
function buildExtractorPrompt(text, language) {
  const examples = {
    hindi: {
      example1: 'Input: "आज मैंने दस रुपये के चार चिप्स बेचे।"\nOutput: {"sales":[{"item":"chips","qty":4,"price":10}],"expenses":[],"needs_clarification":false}',
      example2: 'Input: "मैंने 50 रुपये का दूध खरीदा."\nOutput: {"sales":[],"expenses":[{"item":"milk","amount":50}],"needs_clarification":false}',
    },
    hinglish: {
      example1: 'Input: "maine 20 rupee ka chai becha"\nOutput: {"sales":[{"item":"chai","qty":1,"price":20}],"expenses":[],"needs_clarification":false}',
      example2: 'Input: "3 samosa 15 ka likha"\nOutput: {"sales":[{"item":"samosa","qty":3,"price":15}],"expenses":[],"needs_clarification":false}',
    },
    english: {
      example1: 'Input: "Sold 3 items for 100 each"\nOutput: {"sales":[{"item":"items","qty":3,"price":100}],"expenses":[],"needs_clarification":false}',
      example2: 'Input: "Bought milk for 50"\nOutput: {"sales":[],"expenses":[{"item":"milk","amount":50}],"needs_clarification":false}',
    },
  };

  const langExamples = examples[language] || examples.english;

  return `You are a transaction extraction engine for Indian business owners. Extract structured transaction data.

CRITICAL RULES:
1. Return ONLY valid JSON (no explanations, no markdown)
2. Convert all quantities and prices to numbers (not text)
3. If transaction is unclear or incomplete, set needs_clarification=true with a polite question
4. NEVER invent or hallucinate values - only extract what's explicitly stated
5. Detect transaction type: sales (sold/becha/bikri) vs expenses (bought/kharida/liya)
6. When detecting Hindi/Hinglish: "दस" = 10, "चार" = 4, "बेचे" = sold, "खरीदा" = bought
7. The clarification_question must be in the SAME language as the input
8. Always validate: item names should be meaningful, qty/price must be > 0

EXAMPLES (${language.toUpperCase()}):
${langExamples.example1}
${langExamples.example2}

JSON FORMAT (strict):
{
  "sales": [{"item": string, "qty": number, "price": number}],
  "expenses": [{"item": string, "amount": number}],
  "needs_clarification": boolean,
  "clarification_question": string | null
}

NOW PROCESS THIS INPUT:
Input: ${text}
Output:`;
}

/**
 * Try extracting with Gemini API
 */
async function tryGeminiExtraction(prompt, responseLanguage) {
  if (!env.geminiApiKey) return null;

  try {
    const response = await fetch(`${env.geminiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.geminiApiKey}`,
      },
      body: JSON.stringify({
        model: env.geminiModel || "gemini-1.5-flash",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a transaction JSON extractor. Return ONLY valid JSON with no explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      timeout: 15000,
    });

    if (!response.ok) {
      console.warn(`Gemini extraction failed: ${response.status}`);
      return null;
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      console.warn("Gemini returned empty content");
      return null;
    }

    const parsed = parseJSONSafely(content);
    if (!parsed) return null;

    return {
      sales: parsed.sales || [],
      expenses: parsed.expenses || [],
      meta: {
        source: "llm_gemini",
        needs_clarification: Boolean(parsed.needs_clarification),
        clarification_question: makeRespectfulClarification(
          parsed.clarification_question,
          responseLanguage
        ),
      },
      debug: {
        llm_attempted: true,
        llm_succeeded: true,
        llm_used_live_response: true,
        llm_model: "gemini",
        llm_error: null,
      },
    };
  } catch (error) {
    console.warn(`Gemini extraction error: ${error.message}`);
    return null;
  }
}

/**
 * Try extracting with Groq API (LLaMA fallback)
 */
async function tryGroqExtraction(prompt, responseLanguage) {
  if (!env.groqApiKey) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768", // Groq's fastest model
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a transaction JSON extractor. Return ONLY valid JSON with no explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      timeout: 15000,
    });

    if (!response.ok) {
      console.warn(`Groq extraction failed: ${response.status}`);
      return null;
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      console.warn("Groq returned empty content");
      return null;
    }

    const parsed = parseJSONSafely(content);
    if (!parsed) return null;

    return {
      sales: parsed.sales || [],
      expenses: parsed.expenses || [],
      meta: {
        source: "llm_groq",
        needs_clarification: Boolean(parsed.needs_clarification),
        clarification_question: makeRespectfulClarification(
          parsed.clarification_question,
          responseLanguage
        ),
      },
      debug: {
        llm_attempted: true,
        llm_succeeded: true,
        llm_used_live_response: true,
        llm_model: "groq",
        llm_error: null,
      },
    };
  } catch (error) {
    console.warn(`Groq extraction error: ${error.message}`);
    return null;
  }
}

/**
 * Try extracting with OpenAI GPT API (final fallback)
 */
async function tryOpenAIExtraction(prompt, responseLanguage) {
  if (!env.openaiApiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a transaction JSON extractor. Return ONLY valid JSON with no explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      timeout: 15000,
    });

    if (!response.ok) {
      console.warn(`OpenAI extraction failed: ${response.status}`);
      return null;
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      console.warn("OpenAI returned empty content");
      return null;
    }

    const parsed = parseJSONSafely(content);
    if (!parsed) return null;

    return {
      sales: parsed.sales || [],
      expenses: parsed.expenses || [],
      meta: {
        source: "llm_openai",
        needs_clarification: Boolean(parsed.needs_clarification),
        clarification_question: makeRespectfulClarification(
          parsed.clarification_question,
          responseLanguage
        ),
      },
      debug: {
        llm_attempted: true,
        llm_succeeded: true,
        llm_used_live_response: true,
        llm_model: "openai",
        llm_error: null,
      },
    };
  } catch (error) {
    console.warn(`OpenAI extraction error: ${error.message}`);
    return null;
  }
}

/**
 * Safe JSON parsing with fallback
 */
function parseJSONSafely(content) {
  try {
    const text = String(content || "").trim();

    // Try to extract JSON from markdown code blocks
    let jsonStr = text;
    if (text.includes("```json")) {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonStr = match[1];
    } else if (text.includes("```")) {
      const match = text.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonStr = match[1];
    }

    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn(`JSON parsing failed: ${e.message}`);
    return null;
  }
}

async function callLLM(text) {
  return callLlmFallback(text);
}

/**
 * FIXED: Core transaction processing with Hindi support
 * Pipeline:
 * 1. Detect language & normalize Hindi text
 * 2. Attempt LLM extraction (with multi-model fallback)
 * 3. Attempt rule-based extraction
 * 4. Merge and validate results
 * 5. Compute improved confidence
 */
async function processTransactionText(text) {
  const responseLanguage = detectResponseLanguage(text);

  // CRITICAL: Normalize Hindi input BEFORE processing
  let normalizedText =
    isHindiContent(text) || isHinglish(text)
      ? normalizeHindiText(text)
      : preprocessText(text);

  console.log(`[EXTRACTION] Original text: ${text}`);
  console.log(`[EXTRACTION] Language detected: ${responseLanguage}`);
  console.log(`[EXTRACTION] Normalized text: ${normalizedText}`);

  const llmCandidate = await callLlmFallback(normalizedText);
  console.log(`[EXTRACTION] LLM candidate:`, llmCandidate);

  const ruleCandidate = ruleBasedExtractionSync(normalizedText);
  console.log(`[EXTRACTION] Rule candidate:`, ruleCandidate);

  const llmHasData = (llmCandidate.sales?.length || 0) + (llmCandidate.expenses?.length || 0) > 0;
  const ruleHasData = (ruleCandidate.sales?.length || 0) + (ruleCandidate.expenses?.length || 0) > 0;

  // IMPROVED: Better source selection logic
  const shouldUseRules = !llmCandidate.debug?.llm_succeeded || !llmHasData;
  const selectedCandidate = shouldUseRules ? ruleCandidate : llmCandidate;

  const mergedCandidate = mergeDuplicates(
    reconcileExplicitPrices(normalizedText, selectedCandidate)
  );

  // ============================================
  // SMART INFERENCE LAYER
  // ============================================
  const inferenceResult = applyInferences(mergedCandidate, normalizedText);
  const enrichedData = {
    sales: inferenceResult.sales,
    expenses: inferenceResult.expenses,
  };

  const acceptabilityCheck = canInferAndAccept(enrichedData, normalizedText);

  console.log(`[INFERENCE] Can accept: ${acceptabilityCheck.can_accept}`);
  console.log(`[INFERENCE] Reason: ${acceptabilityCheck.reason}`);
  console.log(`[INFERENCE] Needs clarification: ${acceptabilityCheck.needs_clarification}`);
  console.log(`[INFERENCE] Inferred data:`, inferenceResult.inference_metadata);

  // ============================================

  const ambiguity = detectAmbiguity(normalizedText, enrichedData);
  const selectedSource = shouldUseRules ? "rules" : llmCandidate.debug?.llm_model || "llm";

  const validated = validateOutput({
    sales: enrichedData.sales,
    expenses: enrichedData.expenses,
    meta: {
      source: selectedSource,
      needs_clarification:
        acceptabilityCheck.needs_clarification || ambiguity.ambiguous,
      clarification_question:
        ambiguity.clarification_question &&
          acceptabilityCheck.needs_clarification
          ? buildConfirmationPrompt(enrichedData, responseLanguage)
          : ambiguity.clarification_question,
      inference_metadata: inferenceResult.inference_metadata,
      bulk_pattern: inferenceResult.bulk_pattern,
    },
  });

  if (validated.valid) {
    let baseConfidence = computeConfidence(validated.data, selectedSource);
    const adjustedConfidence = adjustConfidenceForInference(
      baseConfidence,
      inferenceResult.inference_metadata
    );

    return {
      normalizedText,
      result: {
        ...validated.data,
        meta: {
          ...validated.data.meta,
          source: selectedSource,
          confidence: adjustedConfidence,
          language: responseLanguage,
          inference_applied: inferenceResult.inference_metadata.inferred,
          confirmation_needed: acceptabilityCheck.needs_clarification,
        },
        debug: {
          llm_attempted: Boolean(llmCandidate.debug?.llm_attempted),
          llm_succeeded: Boolean(llmCandidate.debug?.llm_succeeded),
          llm_model: llmCandidate.debug?.llm_model || "none",
          llm_used_live_response: Boolean(
            llmCandidate.debug?.llm_used_live_response
          ),
          llm_error: llmCandidate.debug?.llm_error || null,
          rule_has_data: ruleHasData,
          hindi_text_normalized: isHindiContent(text) || isHinglish(text),
          inferred_data: inferenceResult.inference_metadata.inferred,
          inference_reason: inferenceResult.inference_metadata.inferences_applied,
        },
      },
    };
  }

  return {
    normalizedText,
    result: {
      ...createEmptyResponse(
        responseLanguage,
        llmCandidate.debug?.llm_error || "llm_output_failed_validation"
      ),
      meta: {
        ...createEmptyResponse(
          responseLanguage,
          llmCandidate.debug?.llm_error || "llm_output_failed_validation"
        ).meta,
        language: responseLanguage,
        inference_applied: false,
        confirmation_needed: false,
      },
      debug: {
        llm_attempted: Boolean(llmCandidate.debug?.llm_attempted),
        llm_succeeded: false,
        llm_model: llmCandidate.debug?.llm_model || "none",
        llm_used_live_response: false,
        llm_error:
          llmCandidate.debug?.llm_error || "llm_output_failed_validation",
        validation_error: "output_failed_validation",
        inferred_data: false,
        inference_reason: [],
      },
    },
  };
}

async function extractWithRules(text) {
  return ruleBasedExtractionSync(preprocessText(text));
}

async function ruleBasedExtraction(text) {
  return ruleBasedExtractionSync(preprocessText(text));
}

module.exports = {
  preprocessText,
  extractWithRules,
  ruleBasedExtraction,
  detectAmbiguity,
  callLLM,
  callLlmFallback,
  validateOutput,
  computeConfidence,
  mergeDuplicates,
  processTransactionText,
};
