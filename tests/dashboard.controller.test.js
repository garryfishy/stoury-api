jest.mock("../src/modules/dashboard/dashboard.service", () => ({
  dashboardService: {
    getHome: jest.fn(),
    searchAttractions: jest.fn(),
  },
}));

const { createMockNext, createMockResponse } = require("./helpers/http");
const { dashboardService } = require("../src/modules/dashboard/dashboard.service");
const {
  getDashboardHome,
  searchDashboardAttractions,
} = require("../src/modules/dashboard/dashboard.controller");

describe("dashboard controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getDashboardHome returns the dashboard payload", async () => {
    const req = {};
    const res = createMockResponse();
    const next = createMockNext();
    const payload = {
      featured: [],
      meta: {
        featuredCount: 0,
        candidatePoolSize: 0,
        totalActiveAttractionCount: 0,
      },
    };
    dashboardService.getHome.mockResolvedValue(payload);

    await getDashboardHome(req, res, next);

    expect(dashboardService.getHome).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Dashboard home fetched.",
      data: payload,
    });
  });

  test("searchDashboardAttractions returns the global search payload", async () => {
    const req = {
      query: {
        q: "batam",
      },
    };
    const res = createMockResponse();
    const next = createMockNext();
    const payload = {
      query: "batam",
      items: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
      },
    };
    dashboardService.searchAttractions.mockResolvedValue(payload);

    await searchDashboardAttractions(req, res, next);

    expect(dashboardService.searchAttractions).toHaveBeenCalledWith(req.query);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Dashboard attractions fetched.",
      data: {
        items: [],
        query: "batam",
      },
      meta: payload.pagination,
    });
  });
});
