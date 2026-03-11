const { createAdminWebService } = require("../src/modules/admin-web/admin-web.service");

describe("admin web service", () => {
  test("loginAdmin rejects users without the admin role", async () => {
    const service = createAdminWebService({
      loginService: {
        login: jest.fn().mockResolvedValue({
          accessToken: "access-token",
          user: {
            roles: ["user"],
          },
        }),
      },
      enrichmentService: {
        listPendingEnrichment: jest.fn(),
      },
      runtimeStatusProvider: jest.fn(),
    });

    await expect(
      service.loginAdmin({
        email: "user@example.com",
        password: "password",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You do not have permission to access the admin dashboard.",
    });
  });

  test("getDashboardData reuses admin enrichment totals for the shell summary", async () => {
    const enrichmentService = {
      listPendingEnrichment: jest
        .fn()
        .mockResolvedValueOnce({ total: 14 })
        .mockResolvedValueOnce({ total: 3 })
        .mockResolvedValueOnce({ total: 2 }),
    };
    const runtimeStatus = {
      enabled: true,
      status: "enabled",
      message: "Admin attraction enrichment is enabled.",
    };
    const service = createAdminWebService({
      loginService: {
        login: jest.fn(),
      },
      enrichmentService,
      runtimeStatusProvider: jest.fn().mockReturnValue(runtimeStatus),
    });

    const dashboardData = await service.getDashboardData();

    expect(enrichmentService.listPendingEnrichment).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit: 1,
      status: "pending",
      staleOnly: false,
      staleDays: 30,
    });
    expect(enrichmentService.listPendingEnrichment).toHaveBeenNthCalledWith(2, {
      page: 1,
      limit: 1,
      status: "enriched",
      staleOnly: true,
      staleDays: 30,
    });
    expect(enrichmentService.listPendingEnrichment).toHaveBeenNthCalledWith(3, {
      page: 1,
      limit: 1,
      status: "needs_review",
      staleOnly: false,
      staleDays: 30,
    });
    expect(dashboardData).toEqual({
      runtimeStatus,
      summary: {
        pendingCount: 14,
        staleCount: 3,
        needsReviewCount: 2,
        staleDays: 30,
      },
    });
  });
});
