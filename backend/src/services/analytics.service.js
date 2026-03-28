const { listTransactions } = require("./transaction.store");

async function getInsightsSummary(userId = null) {
  const allTransactions = await listTransactions();
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  const transactions = normalizedUserId
    ? allTransactions.filter((transaction) => {
        const entryUserId = transaction.userId
          ? String(transaction.userId._id || transaction.userId)
          : "";
        return entryUserId === normalizedUserId;
      })
    : allTransactions;

  const totals = transactions.reduce(
    (accumulator, transaction) => {
      for (const sale of transaction.sales || []) {
        accumulator.sales += sale.qty * sale.price;
      }

      for (const expense of transaction.expenses || []) {
        accumulator.expenses += expense.amount;
      }

      return accumulator;
    },
    { sales: 0, expenses: 0 }
  );

  return {
    totals,
    transactionCount: transactions.length,
  };
}

module.exports = {
  getInsightsSummary,
};
