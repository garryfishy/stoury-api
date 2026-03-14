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

const searchDashboardAttractions = asyncHandler(async (req, res) => {
  const data = await dashboardService.searchAttractions(req.query);

  return sendSuccess(res, {
    message: "Dashboard attractions fetched.",
    data: {
      items: data.items,
      query: data.query,
    },
    meta: data.pagination,
  });
});

module.exports = {
  getDashboardHome,
  searchDashboardAttractions,
};
