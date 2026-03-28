const analyticsService = require("../services/analytics.service");

async function getInsights(req, res, next) {
  try {
    const result = await analyticsService.getInsightsSummary();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInsights,
};
