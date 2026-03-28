const analyticsService = require("../services/analytics.service");
const { sendSuccess } = require("../utils/apiResponse");

async function getInsights(req, res, next) {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    const result = await analyticsService.getInsightsSummary(userId);
    return sendSuccess(res, result, "Insights fetched");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInsights,
};
