const env = require("../config/env");
const {
  CONFIDENCE_THRESHOLD,
  EXPENSE_HINTS,
} = require("../constants");
const { preprocessText } = require("../utils/normalization");
const { validateOutput } = require("./validation.service");

function createEmptyResponse() {
  return {
    sales: [],
    expenses: [],
    meta: {
      confidence: 0.1,
      source: "fallback",
      needs_clarification: true,
      clarification_question:
        "Please confirm the items, quantities, and prices in this transaction.",
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

function classifyQtyPriceMatch(text, item) {
  const expensePhrase = new RegExp(
    `\\b${item}\\b\\s*(liya|kharcha|kharida)\\b`,
    "i"
  );
  if (expensePhrase.test(text)) {
    return "expense";
  }

  return "sale";
}

function classifyAmountItemMatch(rawMatch, text, item) {
  if (/\b(liya|kharcha|kharida)\b/i.test(rawMatch)) {
    return "expense";
  }

  const expensePhrase = new RegExp(
    `\\b(?:\\d+\\s*ka\\s+)?${item}\\b\\s*(liya|kharcha|kharida)\\b`,
    "i"
  );
  if (expensePhrase.test(text)) {
    return "expense";
  }

  return "sale";
}

function extractRuleMatches(text) {
  const qtyPriceRegex = /(\d+)\s*([a-z]+)\s*(\d+)(?:\s*ka)?/g;
  const amountItemRegex = /(\d+)\s*(?:ka\s+)?([a-z]+)(?:\s+liya)?/g;

  const sales = [];
  const expenses = [];
  const consumedRanges = [];

  let match;
  while ((match = qtyPriceRegex.exec(text)) !== null) {
    const [raw, qtyValue, itemValue, priceValue] = match;
    const qty = Number(qtyValue);
    const price = Number(priceValue);
    const item = itemValue.trim();

    consumedRanges.push([match.index, match.index + raw.length]);

    if (!item || qty <= 0 || price <= 0) {
      continue;
    }

    if (classifyQtyPriceMatch(text, item) === "expense") {
      expenses.push({ item, amount: qty });
      continue;
    }

    sales.push({ item, qty, price });
  }

  while ((match = amountItemRegex.exec(text)) !== null) {
    const [raw, amountValue, itemValue] = match;
    const amount = Number(amountValue);
    const item = itemValue.trim();
    const start = match.index;
    const end = start + raw.length;

    const overlaps = consumedRanges.some(
      ([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart
    );

    if (overlaps || !item || amount <= 0) {
      continue;
    }

    if (classifyAmountItemMatch(raw, text, item) === "expense") {
      expenses.push({ item, amount });
    }
  }

  return { sales, expenses };
}

function detectAmbiguity(text, extractedData) {
  const conjunctions = (text.match(/\baur\b/g) || []).length;
  const hasMultipleMentions =
    extractedData.sales.length + extractedData.expenses.length > 1;
  const priceMentions = (text.match(/\b\d+\s*ka\b/g) || []).length;
  const hasExpenseHints = EXPENSE_HINTS.some((hint) => text.includes(hint));
  const unmatchedItemMention =
    /\b\d+\s+[a-z]+\s+aur\s+[a-z]+\s+\d+\s*ka\b/.test(text) ||
    (conjunctions > 0 && !hasMultipleMentions);
  const missingStructuredOutput =
    extractedData.sales.length === 0 && extractedData.expenses.length === 0;

  if (missingStructuredOutput) {
    return {
      ambiguous: true,
      clarification_question:
        "I could not identify the items clearly. Please restate the transaction with quantities and prices.",
    };
  }

  if (unmatchedItemMention || priceMentions < extractedData.sales.length) {
    return {
      ambiguous: true,
      clarification_question:
        "Please clarify which price belongs to which item.",
    };
  }

  if (hasExpenseHints && extractedData.expenses.length === 0) {
    return {
      ambiguous: true,
      clarification_question:
        "I noticed an expense phrase, but the expense amount or item is unclear.",
    };
  }

  return {
    ambiguous: false,
    clarification_question: null,
  };
}

function computeConfidence(data, source) {
  const hasStructuredData =
    (data.sales?.length || 0) + (data.expenses?.length || 0) > 0;
  const ruleSuccess = hasStructuredData ? 0.4 : 0;
  const completeness = !data.meta?.needs_clarification ? 0.3 : 0.1;
  const validationScore =
    hasStructuredData ||
    (data.meta?.needs_clarification && data.meta?.clarification_question)
      ? 0.3
      : 0;
  const baseScore = ruleSuccess + completeness + validationScore;

  if (source === "llm") {
    return Math.max(0, Math.min(0.85, baseScore - 0.15));
  }

  if (source === "fallback") {
    return Math.max(0.05, Math.min(0.3, baseScore));
  }

  return Math.max(0, Math.min(1, baseScore));
}

function ruleBasedExtraction(text) {
  const extracted = extractRuleMatches(text);
  const ambiguity = detectAmbiguity(text, extracted);
  const merged = mergeDuplicates({
    sales: extracted.sales,
    expenses: extracted.expenses,
    meta: {
      source: "rules",
      needs_clarification: ambiguity.ambiguous,
      clarification_question: ambiguity.clarification_question,
    },
  });

  const confidence = computeConfidence(merged, "rules");

  return {
    data: {
      ...merged,
      meta: {
        ...merged.meta,
        source: "rules",
        confidence,
      },
    },
    success:
      (merged.sales.length > 0 || merged.expenses.length > 0) &&
      !ambiguity.ambiguous,
    confidence,
  };
}

async function callLlmFallback(text) {
  if (!env.openAiApiKey) {
    return createEmptyResponse();
  }

  const prompt = [
    "Extract structured transaction data.",
    "Return ONLY valid JSON.",
    "No explanation.",
    "No hallucination.",
    "If unclear, set needs_clarification to true.",
    'Format: {"sales":[{"item":"string","qty":1,"price":1}],"expenses":[{"item":"string","amount":1}],"needs_clarification":false,"clarification_question":null}',
    `Input: ${text}`,
  ].join("\n");

  try {
    const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openAiModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract transaction data and return strict JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");

    return {
      sales: parsed.sales || [],
      expenses: parsed.expenses || [],
      meta: {
        source: "llm",
        needs_clarification: Boolean(parsed.needs_clarification),
        clarification_question: parsed.clarification_question || null,
      },
    };
  } catch (error) {
    return createEmptyResponse();
  }
}

async function processTransactionText(text) {
  const normalizedText = preprocessText(text);
  const ruleResult = ruleBasedExtraction(normalizedText);

  if (
    ruleResult.success &&
    !ruleResult.data.meta.needs_clarification &&
    ruleResult.confidence >= CONFIDENCE_THRESHOLD
  ) {
    return {
      normalizedText,
      result: ruleResult.data,
    };
  }

  const llmCandidate = await callLlmFallback(normalizedText);
  const mergedLlmCandidate = mergeDuplicates(llmCandidate);
  const validationResult = validateOutput(mergedLlmCandidate);

  if (validationResult.valid) {
    const confidence = computeConfidence(validationResult.data, "llm");
    return {
      normalizedText,
      result: {
        ...validationResult.data,
        meta: {
          ...validationResult.data.meta,
          source: "llm",
          confidence,
        },
      },
    };
  }

  if (ruleResult.data.sales.length || ruleResult.data.expenses.length) {
    return {
      normalizedText,
      result: {
        ...ruleResult.data,
        meta: {
          ...ruleResult.data.meta,
          source: "rules",
          confidence: Math.min(ruleResult.confidence, 0.65),
          needs_clarification: true,
          clarification_question:
            ruleResult.data.meta.clarification_question ||
            "Please confirm the missing quantity, item, or price details.",
        },
      },
    };
  }

  return {
    normalizedText,
    result: createEmptyResponse(),
  };
}

module.exports = {
  preprocessText,
  ruleBasedExtraction,
  detectAmbiguity,
  callLlmFallback,
  validateOutput,
  computeConfidence,
  mergeDuplicates,
  processTransactionText,
};
