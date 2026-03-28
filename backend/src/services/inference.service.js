/**
 * SMART INFERENCE ENGINE
 * 
 * Intelligently infers missing or ambiguous transaction values instead of rejecting.
 * Uses heuristics and pattern matching to fill gaps and confirm with user.
 * 
 * Philosophy: NEVER FAIL if at least one key piece of data exists.
 * Instead: INFER + CONFIRM
 */

const { isHindiContent, isHinglish, detectLanguageStyle } = require("./hindi-normalization.service");

/**
 * Core inference rules
 */
const INFERENCE_RULES = {
    // Rule 1: If qty missing but price exists
    ASSUME_QTY_ONE: "qty_not_provided_assume_one",

    // Rule 2: If price missing but qty exists
    ASSUME_PRICE_ONE: "price_not_provided_assume_one",

    // Rule 3: Common bulk patterns
    BULK_PURCHASE_PATTERN: "bulk_purchase_detected",

    // Rule 4: Item normalization
    ITEM_AUTO_CORRECTION: "item_corrected",

    // Rule 5: Round number heuristic (likely total price)
    ROUND_NUMBER_LIKELY_TOTAL: "round_number_suggests_total",
};

/**
 * Infer missing fields from available data
 * 
 * Heuristics:
 * - "X रुपये के Y item" → qty=Y, price_per_unit=X
 * - Only qty provided → assume price=1
 * - Only price provided → assume qty=1
 * - Both qty & price → compute total
 */
function inferMissingSalesData(sales, originalText) {
    if (!Array.isArray(sales) || sales.length === 0) {
        return { sales: [], inferences: [] };
    }

    const inferences = [];
    const enrichedSales = sales.map((sale) => {
        const inference = {
            item: sale.item,
            rules_applied: [],
            original_qty: sale.qty,
            original_price: sale.price,
        };

        let qty = sale.qty || 0;
        let price = sale.price || 0;

        // Rule 1: If qty exists but price missing
        if (qty > 0 && (!price || price <= 0)) {
            // Heuristic: If qty > 1, likely selling multiple items at base unit price (₹1)
            // If qty = 1, likely a single item transaction (ask user)
            if (qty === 1) {
                price = 1; // Default assumption
                inference.rules_applied.push("ASSUME_DEFAULT_PRICE_FOR_SINGLE_ITEM");
            } else {
                price = 1; // Default: ₹1 per unit
                inference.rules_applied.push("ASSUME_UNIT_PRICE_ONE");
            }
        }

        // Rule 2: If price exists but qty missing
        if (price > 0 && (!qty || qty <= 0)) {
            qty = 1; // Default: selling 1 unit
            inference.rules_applied.push("ASSUME_QTY_ONE_WHEN_PRICE_PROVIDED");
        }

        // Rule 3: Both missing → cannot infer (mark for clarification)
        if ((!qty || qty <= 0) && (!price || price <= 0)) {
            inference.cannot_infer = true;
            inference.rules_applied.push("INSUFFICIENT_DATA_FOR_INFERENCE");
        }

        // Compute total if both qty and price exist
        const total = qty > 0 && price > 0 ? qty * price : 0;

        const enriched = {
            item: sale.item,
            qty: qty > 0 ? qty : 0,
            price: price > 0 ? price : 0,
            total: total,
            inferred: inference.rules_applied.length > 0,
        };

        inferences.push(inference);
        return enriched;
    });

    return { sales: enrichedSales, inferences };
}

/**
 * Infer missing fields from expenses
 */
function inferMissingExpenseData(expenses, originalText) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
        return { expenses: [], inferences: [] };
    }

    const inferences = [];
    const enrichedExpenses = expenses.map((expense) => {
        const inference = {
            item: expense.item,
            rules_applied: [],
            original_amount: expense.amount,
        };

        let amount = expense.amount || 0;

        // If amount missing, cannot fully infer (need specific value)
        if (!amount || amount <= 0) {
            inference.cannot_infer = true;
            inference.rules_applied.push("EXPENSE_AMOUNT_MISSING");
        }

        inferences.push(inference);
        return {
            item: expense.item,
            amount: amount > 0 ? amount : 0,
            inferred: inference.rules_applied.length > 0,
        };
    });

    return { expenses: enrichedExpenses, inferences };
}

/**
 * Detect bulk patterns like "दस रुपये के दस चाय"
 * This means: "10 rupees for 10 teas" → unclear if per-unit or total
 * 
 * Heuristic: When specific pattern detected, assume PRICE PER UNIT
 */
function detectBulkPattern(text, sales) {
    if (!text || !Array.isArray(sales)) {
        return null;
    }

    // Pattern: "X रुपये के Y item"
    // Example: "10 रुपये के 10 चाय" (10 rupees for 10 teas)
    const bulkPattern = /(\d+)\s*(?:रुपy|rs|rupee)?(?:के|का|ki|\s+for)\s+(\d+)\s+(\w+)/gi;
    const match = bulkPattern.exec(text);

    if (match) {
        const priceValue = parseInt(match[1]);
        const qtyValue = parseInt(match[2]);

        console.log(`[INFERENCE] Bulk pattern detected: ${priceValue} per ${qtyValue} ${match[3]}`);

        return {
            detected: true,
            ambiguous: true,
            interpretations: [
                {
                    id: 1,
                    description: `${qtyValue} items @ ₹${priceValue} each (Total: ₹${priceValue * qtyValue})`,
                    qty: qtyValue,
                    price_per_unit: priceValue,
                    total: priceValue * qtyValue,
                    confidence: 0.85,
                },
                {
                    id: 2,
                    description: `${qtyValue} items for total ₹${priceValue} (₹${(priceValue / qtyValue).toFixed(2)} each)`,
                    qty: qtyValue,
                    price_per_unit: priceValue / qtyValue,
                    total: priceValue,
                    confidence: 0.6,
                },
            ],
            recommendation: 1, // Recommend interpretation 1 (higher confidence)
        };
    }

    return null;
}

/**
 * Apply inference to complete transaction structure
 */
function applyInferences(extractedData, originalText) {
    const inference_metadata = {
        inferred: false,
        inferences_applied: [],
        bulk_pattern_detected: false,
        confidence_adjustment: 0,
    };

    // Check for bulk patterns
    const bulkPattern = detectBulkPattern(originalText, extractedData.sales);
    if (bulkPattern && bulkPattern.detected) {
        inference_metadata.bulk_pattern_detected = true;
        inference_metadata.inferences_applied.push("BULK_PATTERN_DETECTED");
        // Apply recommended interpretation
        if (extractedData.sales.length > 0) {
            const rec = bulkPattern.recommendation;
            const interp = bulkPattern.interpretations[rec - 1];
            extractedData.sales[0] = {
                item: extractedData.sales[0].item,
                qty: interp.qty,
                price: interp.price_per_unit,
                total: interp.total,
            };
            inference_metadata.inferences_applied.push(
                `APPLIED_BULK_INTERPRETATION_${rec}`
            );
            inference_metadata.inferred = true;
        }
    }

    // Infer missing sales data
    const { sales, inferences: salesInferences } = inferMissingSalesData(
        extractedData.sales,
        originalText
    );
    if (salesInferences.some((s) => s.rules_applied.length > 0)) {
        inference_metadata.inferred = true;
        inference_metadata.inferences_applied.push("SALES_DATA_INFERRED");
    }

    // Infer missing expense data
    const { expenses, inferences: expenseInferences } = inferMissingExpenseData(
        extractedData.expenses,
        originalText
    );
    if (expenseInferences.some((e) => e.rules_applied.length > 0)) {
        inference_metadata.inferred = true;
        inference_metadata.inferences_applied.push("EXPENSE_DATA_INFERRED");
    }

    return {
        sales,
        expenses,
        inference_metadata,
        bulk_pattern: bulkPattern,
    };
}

/**
 * Check if we can accept without needing clarification
 * Accept if:
 * - item exists + (qty OR price or amount) exists
 * NEVER reject if at least one key piece exists
 */
function canInferAndAccept(extractedData, originalText) {
    const hasSalesData =
        extractedData.sales &&
        extractedData.sales.length > 0 &&
        extractedData.sales.some((s) => s.item);

    const hasExpenseData =
        extractedData.expenses &&
        extractedData.expenses.length > 0 &&
        extractedData.expenses.some((e) => e.item);

    const hasAnyData = hasSalesData || hasExpenseData;

    if (!hasAnyData) {
        return {
            can_accept: false,
            reason: "NO_DATA_TO_INFER",
            needs_clarification: true,
        };
    }

    // Check each sale for inferability
    const salesInferable = extractedData.sales.every((sale) => {
        if (!sale.item) return false; // Item required
        // At least qty or price should be present for inference
        return (sale.qty && sale.qty > 0) || (sale.price && sale.price > 0);
    });

    // Check each expense for inferability
    const expensesInferable = extractedData.expenses.every((expense) => {
        if (!expense.item) return false; // Item required
        // Amount should ideally be present
        return expense.amount && expense.amount > 0;
    });

    const allInferable = salesInferable && expensesInferable;

    return {
        can_accept: true, // Always try to accept
        reason: allInferable ? "ALL_DATA_COMPLETE" : "PARTIAL_DATA_INFERABLE",
        needs_clarification: !allInferable,
        partially_inferred: !allInferable,
    };
}

/**
 * Build a user-friendly confirmation message
 */
function buildConfirmationMessage(inferredData, language) {
    const lang = language || "english";
    let message = "";

    if (lang === "hindi") {
        if (inferredData.sales && inferredData.sales.length > 0) {
            const salesMsg = inferredData.sales
                .map(
                    (s) =>
                        `${s.qty} ${s.item} @ ₹${s.price} प्रति (कुल: ₹${s.total || s.qty * s.price})`
                )
                .join(", ");
            message += `बिक्री: ${salesMsg}\n`;
        }

        if (inferredData.expenses && inferredData.expenses.length > 0) {
            const expenseMsg = inferredData.expenses
                .map((e) => `${e.item}: ₹${e.amount}`)
                .join(", ");
            message += `खर्च: ${expenseMsg}\n`;
        }

        if (inferredData.inference_metadata?.inferred) {
            message += `\n(कुछ विवरण अनुमानित हैं)`;
        }
    } else if (lang === "hinglish") {
        if (inferredData.sales && inferredData.sales.length > 0) {
            const salesMsg = inferredData.sales
                .map(
                    (s) =>
                        `${s.qty} ${s.item} @ Rs${s.price} each (Total: Rs${s.total || s.qty * s.price})`
                )
                .join(", ");
            message += `Sale: ${salesMsg}\n`;
        }

        if (inferredData.expenses && inferredData.expenses.length > 0) {
            const expenseMsg = inferredData.expenses
                .map((e) => `${e.item}: Rs${e.amount}`)
                .join(", ");
            message += `Expense: ${expenseMsg}\n`;
        }

        if (inferredData.inference_metadata?.inferred) {
            message += `\n(Some details inferred)`;
        }
    } else {
        if (inferredData.sales && inferredData.sales.length > 0) {
            const salesMsg = inferredData.sales
                .map(
                    (s) =>
                        `${s.qty} ${s.item} @ ₹${s.price} each (Total: ₹${s.total || s.qty * s.price})`
                )
                .join(", ");
            message += `Sales: ${salesMsg}\n`;
        }

        if (inferredData.expenses && inferredData.expenses.length > 0) {
            const expenseMsg = inferredData.expenses
                .map((e) => `${e.item}: ₹${e.amount}`)
                .join(", ");
            message += `Expenses: ${expenseMsg}\n`;
        }

        if (inferredData.inference_metadata?.inferred) {
            message += `\n(Some details inferred)`;
        }
    }

    return message.trim();
}

/**
 * Build confirmation prompt for user
 */
function buildConfirmationPrompt(inferredData, language) {
    const lang = language || "english";
    const confirmationMsg = buildConfirmationMessage(inferredData, lang);

    if (lang === "hindi") {
        return {
            title: "क्या आप सुनिश्चित हैं?",
            message: `क्या आप कहना चाहते हैं:\n\n${confirmationMsg}`,
            confirm_button: "✅ हाँ, सही है",
            edit_button: "✏️ संपादित करें",
            cancel_button: "❌ रद्द करें",
        };
    } else if (lang === "hinglish") {
        return {
            title: "Is this correct?",
            message: `Kya aap kah rahe hein:\n\n${confirmationMsg}`,
            confirm_button: "✅ Haan, sahi hai",
            edit_button: "✏️ Edit karein",
            cancel_button: "❌ Cancel",
        };
    } else {
        return {
            title: "Is this correct?",
            message: `Did you mean:\n\n${confirmationMsg}`,
            confirm_button: "✅ Yes, correct",
            edit_button: "✏️ Edit",
            cancel_button: "❌ Cancel",
        };
    }
}

/**
 * Adjust confidence based on inference quality
 */
function adjustConfidenceForInference(baseConfidence, inferenceMetadata) {
    if (!inferenceMetadata.inferred) {
        return baseConfidence; // No adjustment if nothing inferred
    }

    // If we inferred data, reduce confidence slightly
    const inferencePenalty = 0.1; // -10% confidence for inference
    return Math.max(0.5, baseConfidence - inferencePenalty);
}

module.exports = {
    // Core inference functions
    applyInferences,
    canInferAndAccept,
    inferMissingSalesData,
    inferMissingExpenseData,
    detectBulkPattern,

    // User-facing functions
    buildConfirmationMessage,
    buildConfirmationPrompt,

    // Utilities
    adjustConfidenceForInference,
    INFERENCE_RULES,
};
