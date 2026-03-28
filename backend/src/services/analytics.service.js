async function getInsightsSummary() {
  return {
    totals: {
      sales: 0,
      expenses: 0,
    },
    message: "Analytics service placeholder",
  };
}

module.exports = {
  getInsightsSummary,
};
