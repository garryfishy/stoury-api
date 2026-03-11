jest.mock("../src/modules/dashboard/dashboard.service", () => ({
  dashboardService: {
    getHome: jest.fn(),
  },
}));

const { createMockNext, createMockResponse } = require("./helpers/http");
const { dashboardService } = require("../src/modules/dashboard/dashboard.service");
const {
  getDashboardHome,
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
      destination: {
        slug: "batam",
      },
      featured: [],
      exploreMore: [],
      meta: {
        defaultDestinationSlug: "batam",
        featuredCount: 0,
        exploreMoreCount: 0,
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
});
