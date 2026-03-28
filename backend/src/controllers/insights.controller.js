const analyticsService = require("../services/analytics.service");

async function getInsights(req, res, next) {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    const result = await analyticsService.getInsightsSummary(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInsights,
};
