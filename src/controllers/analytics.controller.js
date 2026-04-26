const asyncHandler = require("../utils/async-handler");
const analyticsService = require("../services/analytics.service");

const getAnalytics = asyncHandler(async (_req, res) => {
  const data = await analyticsService.getSubjectAnalytics();

  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getAnalytics
};
