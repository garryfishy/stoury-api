jest.mock("../src/modules/admin-web/admin-web.service", () => ({
  adminWebService: {
    getDashboardData: jest.fn(),
    loginAdmin: jest.fn(),
  },
}));

const {
  adminWebService,
} = require("../src/modules/admin-web/admin-web.service");
const {
  handleLogin,
  handleLogout,
  renderDashboard,
  renderLoginPage,
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
