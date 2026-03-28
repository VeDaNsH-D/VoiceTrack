const { listTransactions } = require("./transaction.store");

async function getInsightsSummary() {
  const transactions = await listTransactions();
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
