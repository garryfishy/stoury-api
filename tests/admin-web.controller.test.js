jest.mock("../src/modules/admin-web/admin-web.service", () => ({
  adminWebService: {
    backfillPendingAttractionPhotos: jest.fn(),
    backfillPendingBatchPhotos: jest.fn(),
    backfillDestinationPhotos: jest.fn(),
    getDashboardData: jest.fn(),
    getPendingEnrichmentPageData: jest.fn(),
    getPendingReviewPageData: jest.fn(),
    enrichDestination: jest.fn(),
    enrichPendingAttraction: jest.fn(),
    enrichPendingBatch: jest.fn(),
    loginAdmin: jest.fn(),
    rejectPendingReview: jest.fn(),
    resolvePendingReview: jest.fn(),
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
  renderPendingEnrichmentShell,
  renderPendingReviewPage,
  rejectPendingReview,
  resolvePendingReview,
  runDestinationEnrichment,
  runPendingAttractionEnrichment,
  runPendingAttractionPhotoBackfill,
  runPendingBatchEnrichment,
  runPendingBatchPhotoBackfill,
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

  test("renderPendingEnrichmentShell renders the operational pending page", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      query: {},
    };
    const res = createResponse();
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [{ id: "dest-1", name: "Batam" }],
      pendingEnrichment: {
        items: [{ id: "attr-1", name: "Pantai Nongsa", enrichment: { status: "pending" } }],
        total: 1,
        pagination: { page: 1, totalPages: 1 },
      },
    });

    await renderPendingEnrichmentShell(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        pageTitle: "Pending Enrichment",
        pendingEnrichment: expect.objectContaining({
          total: 1,
        }),
      })
    );
  });

  test("runPendingAttractionEnrichment re-renders the pending page with an alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { attractionId: "attr-1" },
      query: {},
    };
    const res = createResponse();
    adminWebService.enrichPendingAttraction.mockResolvedValue({
      outcome: "enriched",
      attraction: { name: "Pantai Nongsa" },
    });
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [],
      pendingEnrichment: { items: [], total: 0, pagination: { page: 1, totalPages: 1 } },
    });

    await runPendingAttractionEnrichment(req, res, jest.fn());

    expect(adminWebService.enrichPendingAttraction).toHaveBeenCalledWith("attr-1");
    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Attraction enrichment processed",
        }),
      })
    );
  });

  test("runPendingAttractionPhotoBackfill re-renders the pending page with a photo alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { attractionId: "attr-1" },
      body: { force: "true" },
      query: {},
    };
    const res = createResponse();
    adminWebService.backfillPendingAttractionPhotos.mockResolvedValue({
      attemptedCount: 1,
      updatedCount: 1,
      skippedCount: 0,
      failedCount: 0,
    });
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [],
      pendingEnrichment: {
        items: [],
        total: 0,
        pagination: { page: 1, totalPages: 1 },
      },
    });

    await runPendingAttractionPhotoBackfill(req, res, jest.fn());

    expect(adminWebService.backfillPendingAttractionPhotos).toHaveBeenCalledWith("attr-1", {
      force: true,
    });
    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Attraction photo backfill processed",
        }),
      })
    );
  });

  test("runPendingBatchEnrichment re-renders the pending page with a batch alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      body: { destinationId: "dest-1", status: "pending", limit: "10", staleOnly: "false", staleDays: "30" },
      query: {},
    };
    const res = createResponse();
    adminWebService.enrichPendingBatch.mockResolvedValue({
      attemptedCount: 5,
      enrichedCount: 3,
      needsReviewCount: 1,
      failedCount: 1,
    });
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [],
      pendingEnrichment: { items: [], total: 0, pagination: { page: 1, totalPages: 1 } },
    });

    await runPendingBatchEnrichment(req, res, jest.fn());

    expect(adminWebService.enrichPendingBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationId: "dest-1",
        status: "pending",
        limit: 10,
      })
    );
    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Batch enrichment processed",
        }),
      })
    );
  });

  test("runPendingBatchPhotoBackfill re-renders the pending page with a batch photo alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      body: {
        destinationId: "dest-1",
        status: "enriched",
        limit: "25",
        staleOnly: "false",
        staleDays: "30",
        force: "true",
      },
      query: {},
    };
    const res = createResponse();
    adminWebService.backfillPendingBatchPhotos.mockResolvedValue({
      attemptedCount: 3,
      updatedCount: 2,
      skippedCount: 1,
      failedCount: 0,
    });
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [],
      pendingEnrichment: {
        items: [],
        total: 0,
        pagination: { page: 1, totalPages: 1 },
      },
    });

    await runPendingBatchPhotoBackfill(req, res, jest.fn());

    expect(adminWebService.backfillPendingBatchPhotos).toHaveBeenCalledWith({
      destinationId: "dest-1",
      limit: 25,
      force: true,
    });
    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Batch photo backfill processed",
        }),
      })
    );
  });

  test("renderPendingReviewPage renders the manual review screen", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { attractionId: "attr-1" },
      query: {},
    };
    const res = createResponse();
    adminWebService.getPendingReviewPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      review: {
        attraction: { id: "attr-1", name: "Pantai Nongsa" },
        candidates: [{ placeId: "google-place-1", name: "Pantai Nongsa" }],
        outcome: "needs_review",
      },
    });

    await renderPendingReviewPage(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-review",
      expect.objectContaining({
        pageTitle: "Review Enrichment Match",
        review: expect.objectContaining({
          attraction: expect.objectContaining({
            id: "attr-1",
          }),
        }),
      })
    );
  });

  test("resolvePendingReview re-renders the queue page with a success alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { attractionId: "attr-1" },
      body: { placeId: "google-place-1" },
      query: {},
    };
    const res = createResponse();
    adminWebService.resolvePendingReview.mockResolvedValue({
      attraction: { name: "Pantai Nongsa" },
    });
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [],
      pendingEnrichment: { items: [], total: 0, pagination: { page: 1, totalPages: 1 } },
    });

    await resolvePendingReview(req, res, jest.fn());

    expect(adminWebService.resolvePendingReview).toHaveBeenCalledWith(
      "attr-1",
      "google-place-1"
    );
    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Review resolved",
        }),
      })
    );
  });

  test("rejectPendingReview re-renders the queue page with a warning alert", async () => {
    const req = {
      adminAuth: { email: "admin@example.com" },
      params: { attractionId: "attr-1" },
      body: { reason: "No suitable Google match." },
      query: {},
    };
    const res = createResponse();
    adminWebService.rejectPendingReview.mockResolvedValue({
      attraction: { name: "Pantai Nongsa" },
      reason: "No suitable Google match.",
    });
    adminWebService.getPendingEnrichmentPageData.mockResolvedValue({
      runtimeStatus: { status: "enabled", message: "ok" },
      summary: { pendingCount: 1, staleCount: 0, needsReviewCount: 0, staleDays: 30 },
      destinationOptions: [],
      pendingEnrichment: { items: [], total: 0, pagination: { page: 1, totalPages: 1 } },
    });

    await rejectPendingReview(req, res, jest.fn());

    expect(adminWebService.rejectPendingReview).toHaveBeenCalledWith(
      "attr-1",
      "No suitable Google match."
    );
    expect(res.render).toHaveBeenCalledWith(
      "admin/pending-placeholder",
      expect.objectContaining({
        alert: expect.objectContaining({
          title: "Review rejected",
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
