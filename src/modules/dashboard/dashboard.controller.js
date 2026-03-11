const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { dashboardService } = require("./dashboard.service");

const getDashboardHome = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getHome();

  return sendSuccess(res, {
    message: "Dashboard home fetched.",
    data,
  });
});

module.exports = {
  getDashboardHome,
};
