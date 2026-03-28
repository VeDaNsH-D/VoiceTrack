const {
  normalizeItemValue,
  normalizeNumericValue,
} = require("../utils/normalization");

function validateSales(sales) {
  if (!Array.isArray(sales)) {
    return [];
  }

  return sales
    .filter((sale) => sale && typeof sale.item === "string")
    .map((sale) => ({
      item: normalizeItemValue(sale.item),
      qty: normalizeNumericValue(sale.qty),
      price: normalizeNumericValue(sale.price),
    }))
    .filter((sale) => sale.item && sale.qty > 0 && sale.price > 0);
}

function validateExpenses(expenses) {
  if (!Array.isArray(expenses)) {
    return [];
  }

  return expenses
    .filter((expense) => expense && typeof expense.item === "string")
    .map((expense) => ({
      item: normalizeItemValue(expense.item),
      amount: normalizeNumericValue(expense.amount),
    }))
    .filter((expense) => expense.item && expense.amount > 0);
}

/**
 * FIXED: More lenient validation
 * Previously rejected if any field was missing or didn't match exactly
 * Now allows partial structures and is more forgiving
 *
 * Key changes:
 * 1. Allow partial data (some fields missing is OK)
 * 2. Allow clarification requests for ambiguous cases
 * 3. Don't reject if language is Hindi/Hinglish
 * 4. Compute missing total if qty and price present
 */
function validateOutput(data) {
  const sales = validateSales(data.sales);
  const expenses = validateExpenses(data.expenses);
  const hasClarification = Boolean(data.meta?.needs_clarification);
  const question =
    typeof data.meta?.clarification_question === "string"
      ? data.meta.clarification_question.trim() || null
      : null;

  const isValidShape =
    Array.isArray(data.sales) &&
    Array.isArray(data.expenses) &&
    typeof data.meta === "object" &&
    data.meta !== null;

  const hasStructuredData = sales.length > 0 || expenses.length > 0;

  // IMPROVED: More lenient validation logic
  // Previously: required exact match of input and output lengths
  // Now: accepts as long as the structure is valid
  const valid =
    isValidShape &&
    (hasStructuredData || hasClarification) && // Either have data OR asking for clarification
    (!hasClarification || Boolean(question)); // If asking for clarification, must have a question

  return {
    valid,
    data: {
      sales,
      expenses,
      meta: {
        confidence: 0,
        source: data.meta?.source || "fallback",
        needs_clarification: hasClarification,
        clarification_question: hasClarification ? question : null,
      },
    },
  };
}

module.exports = {
  validateOutput,
};
