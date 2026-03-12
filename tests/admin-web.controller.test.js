jest.mock("../src/modules/admin-web/admin-web.service", () => ({
  adminWebService: {
    backfillDestinationPhotos: jest.fn(),
    getDashboardData: jest.fn(),
    enrichDestination: jest.fn(),
    loginAdmin: jest.fn(),
    setDestinationActiveState: jest.fn(),
  },
}));

const {
  adminWebService,
} = require("../src/modules/admin-web/admin-web.service");
const {
  handleLogin,
  handleLogout,
  renderDashboard,
  renderDestinationsPage,
  renderLoginPage,
  runDestinationEnrichment,
  runDestinationPhotoBackfill,
  updateDestinationState,
} = require("../src/modules/admin-web/admin-web.controller");

const createResponse = () => {
  const res = {
    clearCookie: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    locals: {},
    redirect: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };

  return res;
};

describe("admin web controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renderLoginPage renders the admin login template", () => {
    const req = {
      query: {
        reason: "auth_required",
      },
    };
    const res = createResponse();

    renderLoginPage(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "admin/login",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Sign in required",
        }),
        nextPath: "/admin",
        pageTitle: "Admin Login",
      })
    );
  });

  test("handleLogin sets the admin cookie and redirects on success", async () => {
    const req = {
      body: {
        email: "admin@example.com",
        password: "admin",
        next: "/admin/enrichment/pending",
      },
    };
    const res = createResponse();

    adminWebService.loginAdmin.mockResolvedValue({
      accessToken: "admin-access-token",
      user: {
        roles: ["admin"],
      },
    });

    await handleLogin(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "stoury_admin_access",
      "admin-access-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/admin",
        sameSite: "lax",
      })
    );
    expect(res.redirect).toHaveBeenCalledWith("/admin/enrichment/pending");
  });

  test("renderDashboard renders the dashboard shell with summary data", async () => {
    const req = {
      adminAuth: {
        email: "admin@example.com",
      },
    };
    const res = createResponse();

    adminWebService.getDashboardData.mockResolvedValue({
      runtimeStatus: {
        enabled: true,
        status: "enabled",
        message: "Admin attraction enrichment is enabled.",
      },
      summary: {
        pendingCount: 12,
        staleCount: 4,
        needsReviewCount: 2,
        staleDays: 30,
      },
    });

    await renderDashboard(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "admin/dashboard",
      expect.objectContaining({
        adminUser: req.adminAuth,
        pageTitle: "Admin Dashboard",
        summary: expect.objectContaining({
          pendingCount: 12,
        }),
      })
    );
  });

  test("renderDestinationsPage renders the destination operations page", async () => {
    const req = {
      adminAuth: {
        email: "admin@example.com",
      },
    };
    const res = createResponse();

    adminWebService.getDashboardData.mockResolvedValue({
      runtimeStatus: {
        enabled: true,
        status: "enabled",
        message: "Admin attraction enrichment is enabled.",
      },
      summary: {
        pendingCount: 12,
        staleCount: 4,
        needsReviewCount: 2,
        staleDays: 30,
      },
      destinations: [{ id: "dest-1", name: "Batam", isActive: true }],
    });

    await renderDestinationsPage(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "admin/destinations",
      expect.objectContaining({
        pageTitle: "Admin Destinations",
        destinations: expect.arrayContaining([
          expect.objectContaining({
            id: "dest-1",
          }),
        ]),
      })
    );
  });

  test("updateDestinationState re-renders the dashboard with a success alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { destinationId: "dest-1" },
      body: { isActive: "true" },
    };
    const res = createResponse();
    adminWebService.setDestinationActiveState.mockResolvedValue({
      id: "dest-1",
      name: "Batam",
      isActive: true,
    });
    adminWebService.getDashboardData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinations: [],
    });

    await updateDestinationState(req, res, jest.fn());

    expect(adminWebService.setDestinationActiveState).toHaveBeenCalledWith("dest-1", true);
    expect(res.render).toHaveBeenCalledWith(
      "admin/destinations",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Destination updated",
        }),
      })
    );
  });

  test("runDestinationEnrichment re-renders the dashboard with the batch result", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { destinationId: "dest-1" },
      body: {},
    };
    const res = createResponse();
    adminWebService.enrichDestination.mockResolvedValue({
      attemptedCount: 5,
      enrichedCount: 3,
      needsReviewCount: 1,
      failedCount: 1,
    });
    adminWebService.getDashboardData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinations: [],
    });

    await runDestinationEnrichment(req, res, jest.fn());

    expect(adminWebService.enrichDestination).toHaveBeenCalledWith("dest-1");
    expect(res.render).toHaveBeenCalledWith(
      "admin/destinations",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Destination enrichment completed",
        }),
      })
    );
  });

  test("runDestinationPhotoBackfill re-renders the dashboard with the photo result", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { destinationId: "dest-1" },
      body: { force: "true" },
    };
    const res = createResponse();
    adminWebService.backfillDestinationPhotos.mockResolvedValue({
      attemptedCount: 4,
      updatedCount: 2,
      skippedCount: 2,
      failedCount: 0,
    });
    adminWebService.getDashboardData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinations: [],
    });

    await runDestinationPhotoBackfill(req, res, jest.fn());

    expect(adminWebService.backfillDestinationPhotos).toHaveBeenCalledWith("dest-1", {
      force: true,
    });
    expect(res.render).toHaveBeenCalledWith(
      "admin/destinations",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Destination photo backfill completed",
        }),
      })
    );
  });

  test("handleLogout clears the admin cookie and redirects to login", () => {
    const req = {};
    const res = createResponse();

    handleLogout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      "stoury_admin_access",
      expect.objectContaining({
        path: "/admin",
      })
    );
    expect(res.redirect).toHaveBeenCalledWith("/admin/login?reason=logged_out");
  });
});
