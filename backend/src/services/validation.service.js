function validateSales(sales) {
  if (!Array.isArray(sales)) {
    return [];
  }

  return sales
    .filter((sale) => sale && typeof sale.item === "string")
    .map((sale) => ({
      item: sale.item.trim(),
      qty: Number(sale.qty),
      price: Number(sale.price),
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
      item: expense.item.trim(),
      amount: Number(expense.amount),
    }))
    .filter((expense) => expense.item && expense.amount > 0);
}

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

  const valid =
    isValidShape &&
    sales.length === data.sales.length &&
    expenses.length === data.expenses.length &&
    (!hasClarification || Boolean(question));

  return {
    valid,
    data: {
      sales,
      expenses,
      meta: {
        confidence: 0,
        source: data.meta?.source || "fallback",
        needs_clarification: hasClarification,
        clarification_question: question,
      },
    },
  };
}

module.exports = {
  validateOutput,
};
