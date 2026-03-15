const { asyncHandler } = require("../../utils/async-handler");
const {
  getAdminEnrichmentRuntimeStatus,
} = require("../admin-attractions/admin-attractions.runtime");
const { adminLoginSchema } = require("./admin-web.validators");
const { adminWebService } = require("./admin-web.service");
const {
  buildAdminLoginUrl,
  clearAdminAuthCookie,
  getLoginAlertFromReason,
  getRuntimeStatusTone,
  sanitizeAdminNextPath,
  setAdminAuthCookie,
} = require("./admin-web.helpers");

const buildBaseViewModel = ({
  pageTitle,
  activeNav = "dashboard",
  adminUser = null,
  alert = null,
} = {}) => ({
  activeNav,
  adminUser,
  alert,
  assetsBasePath: "/admin/assets",
  pageDescription: "Internal Stoury operations console.",
  pageTitle,
});

const ATTRACTION_ASSETS_PAGE_PATH = "/admin/attraction-assets";

const coerceFormBoolean = (value, fallback = false) => {
  const normalizedValue = Array.isArray(value) ? value[value.length - 1] : value;
  const normalized = String(normalizedValue || "").trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  return ["true", "1", "yes", "on"].includes(normalized);
};

const buildLoginViewModel = ({
  adminUser = null,
  alert = null,
  formData = {},
  nextPath = "/admin",
} = {}) => ({
  ...(function buildViewState() {
    const runtimeStatus = getAdminEnrichmentRuntimeStatus();

    return {
      runtimeStatus,
      runtimeStatusTone: getRuntimeStatusTone(runtimeStatus.status),
    };
  })(),
  ...buildBaseViewModel({
    activeNav: "login",
    adminUser,
    alert,
    pageTitle: "Admin Login",
  }),
  formData: {
    email: formData.email || "",
  },
  nextPath: sanitizeAdminNextPath(nextPath),
});

const buildDashboardViewModel = ({
  adminUser,
  alert = null,
  runtimeStatus,
  summary,
} = {}) => ({
  ...buildBaseViewModel({
    activeNav: "dashboard",
    adminUser,
    alert,
    pageTitle: "Admin Dashboard",
  }),
  quickLinks: [
    {
      href: "/admin/destinations",
      label: "Destinations",
      description: "Toggle destination availability and launch destination-scoped jobs.",
      tone: "primary",
    },
    {
      href: ATTRACTION_ASSETS_PAGE_PATH,
      label: "Attraction Assets",
      description: "Upload local images for attractions and filter what still needs coverage.",
      tone: "primary",
    },
    {
      href: "/admin/enrichment/pending",
      label: "Pending Enrichment",
      description: "Open the operational enrichment workspace shell.",
      tone: "secondary",
    },
    {
      href: "/docs#/Admin%20Attractions",
      label: "API Reference",
      description: "Inspect the admin enrichment HTTP contract and examples.",
      tone: "secondary",
    },
    {
      href: "/health",
      label: "System Health",
      description: "Check runtime status and feature flags from the health endpoint.",
      tone: "secondary",
    },
  ],
  runtimeStatus,
  runtimeStatusTone: getRuntimeStatusTone(runtimeStatus.status),
  summary,
});

const buildDestinationsViewModel = ({
  adminUser,
  alert = null,
  runtimeStatus,
  summary,
  destinations = [],
} = {}) => ({
  ...buildBaseViewModel({
    activeNav: "destinations",
    adminUser,
    alert,
    pageTitle: "Admin Destinations",
  }),
  runtimeStatus,
  runtimeStatusTone: getRuntimeStatusTone(runtimeStatus.status),
  summary,
  destinations,
});

const normalizeAssetPageFilters = (query = {}) => ({
  destinationId: query.destinationId ? String(query.destinationId).trim() : "",
  imageState: query.imageState ? String(query.imageState).trim() : "all",
  page: Math.max(1, Number.parseInt(query.page || "1", 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit || "24", 10) || 24)),
  q: query.q ? String(query.q).trim() : "",
});

const buildAssetPageHref = (filters, page) => {
  const params = new URLSearchParams();

  if (filters.destinationId) {
    params.set("destinationId", filters.destinationId);
  }

  if (filters.imageState && filters.imageState !== "all") {
    params.set("imageState", filters.imageState);
  }

  if (filters.limit && filters.limit !== 24) {
    params.set("limit", String(filters.limit));
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  params.set("page", String(page));

  return `${ATTRACTION_ASSETS_PAGE_PATH}?${params.toString()}`;
};

const buildAttractionAssetsViewModel = ({
  adminUser,
  alert = null,
  destinationOptions = [],
  filters,
  items = [],
  pagination,
  runtimeStatus,
  summary,
} = {}) => ({
  ...buildBaseViewModel({
    activeNav: "attraction-assets",
    adminUser,
    alert,
    pageTitle: "Attraction Assets",
  }),
  buildPageHref: (page) => buildAssetPageHref(filters, page),
  destinationOptions,
  filters,
  items,
  pagination,
  runtimeStatus,
  runtimeStatusTone: getRuntimeStatusTone(runtimeStatus.status),
  summary,
});

const normalizePendingPageFilters = (query = {}) => ({
  destinationId: query.destinationId ? String(query.destinationId).trim() : "",
  status: query.status ? String(query.status).trim() : "pending",
  page: Math.max(1, Number.parseInt(query.page || "1", 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit || "25", 10) || 25)),
  staleOnly: coerceFormBoolean(query.staleOnly, false),
  staleDays: Math.min(365, Math.max(1, Number.parseInt(query.staleDays || "30", 10) || 30)),
});

const buildPendingPageHref = (filters, page) => {
  const params = new URLSearchParams();

  if (filters.destinationId) {
    params.set("destinationId", filters.destinationId);
  }

  if (filters.status && filters.status !== "pending") {
    params.set("status", filters.status);
  }

  if (filters.limit && filters.limit !== 25) {
    params.set("limit", String(filters.limit));
  }

  if (filters.staleOnly) {
    params.set("staleOnly", "true");
  }

  if (filters.staleDays && filters.staleDays !== 30) {
    params.set("staleDays", String(filters.staleDays));
  }

  params.set("page", String(page));

  return `/admin/enrichment/pending?${params.toString()}`;
};

const buildPendingEnrichmentViewModel = ({
  adminUser,
  alert = null,
  runtimeStatus,
  summary,
  pendingEnrichment,
  destinationOptions = [],
  filters,
} = {}) => ({
  ...buildBaseViewModel({
    activeNav: "pending-enrichment",
    adminUser,
    alert,
    pageTitle: "Pending Enrichment",
  }),
  buildPageHref: (page) => buildPendingPageHref(filters, page),
  destinationOptions,
  filters,
  pendingEnrichment,
  pagination: pendingEnrichment.pagination,
  runtimeStatus,
  runtimeStatusTone: getRuntimeStatusTone(runtimeStatus.status),
  summary,
});

const buildPendingReviewViewModel = ({
  adminUser,
  alert = null,
  runtimeStatus,
  review,
  filters,
} = {}) => ({
  ...buildBaseViewModel({
    activeNav: "pending-enrichment",
    adminUser,
    alert,
    pageTitle: "Review Enrichment Match",
  }),
  backHref: buildPendingPageHref(filters, filters.page || 1),
  filters,
  review,
  runtimeStatus,
  runtimeStatusTone: getRuntimeStatusTone(runtimeStatus.status),
});

const renderDashboardPage = async (req, res, { alert = null, statusCode = 200 } = {}) => {
  const dashboardData = await adminWebService.getDashboardData();

  return res.status(statusCode).render(
    "admin/dashboard",
    buildDashboardViewModel({
      adminUser: req.adminAuth,
      alert,
      runtimeStatus: dashboardData.runtimeStatus,
      summary: dashboardData.summary,
    })
  );
};

const renderDestinationsPageWithAlert = async (
  req,
  res,
  { alert = null, statusCode = 200 } = {}
) => {
  const dashboardData = await adminWebService.getDashboardData();

  return res.status(statusCode).render(
    "admin/destinations",
    buildDestinationsViewModel({
      adminUser: req.adminAuth,
      alert,
      runtimeStatus: dashboardData.runtimeStatus,
      summary: dashboardData.summary,
      destinations: dashboardData.destinations,
    })
  );
};

const renderPendingEnrichmentPageWithAlert = async (
  req,
  res,
  { alert = null, statusCode = 200 } = {}
) => {
  const filters = normalizePendingPageFilters(req.query);
  const pageData = await adminWebService.getPendingEnrichmentPageData(filters);

  return res.status(statusCode).render(
    "admin/pending-placeholder",
    buildPendingEnrichmentViewModel({
      adminUser: req.adminAuth,
      alert,
      runtimeStatus: pageData.runtimeStatus,
      summary: pageData.summary,
      pendingEnrichment: pageData.pendingEnrichment,
      destinationOptions: pageData.destinationOptions,
      filters,
    })
  );
};

const renderAttractionAssetsPageWithAlert = async (
  req,
  res,
  { alert = null, statusCode = 200 } = {}
) => {
  const filters = normalizeAssetPageFilters(req.query);
  const pageData = await adminWebService.getAttractionAssetsPageData(filters);

  return res.status(statusCode).render(
    "admin/assets",
    buildAttractionAssetsViewModel({
      adminUser: req.adminAuth,
      alert,
      destinationOptions: pageData.destinationOptions,
      filters,
      items: pageData.items,
      pagination: pageData.pagination,
      runtimeStatus: pageData.runtimeStatus,
      summary: pageData.summary,
    })
  );
};

const renderPendingReviewPageWithAlert = async (
  req,
  res,
  attractionId,
  { alert = null, statusCode = 200 } = {}
) => {
    const filters = normalizePendingPageFilters(req.query);
    const pageData = await adminWebService.getPendingReviewPageData(attractionId, filters);

    return res.status(statusCode).render(
      "admin/pending-review",
      buildPendingReviewViewModel({
        adminUser: req.adminAuth,
        alert,
        runtimeStatus: pageData.runtimeStatus,
        review: pageData.review,
        filters,
      })
    );
};

const renderLoginPage = (req, res) => {
  const nextPath = sanitizeAdminNextPath(req.query.next);
  const alert = getLoginAlertFromReason(req.query.reason);

  return res.render(
    "admin/login",
    buildLoginViewModel({
      alert,
      nextPath,
    })
  );
};

const handleLogin = async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  const nextPath = sanitizeAdminNextPath(req.body?.next);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message || "Please provide a valid email and password.";

    return res.status(422).render(
      "admin/login",
      buildLoginViewModel({
        alert: {
          type: "danger",
          title: "Check the form",
          message,
        },
        formData: req.body,
        nextPath,
      })
    );
  }

  try {
    const authPayload = await adminWebService.loginAdmin(parsed.data);

    setAdminAuthCookie(res, authPayload.accessToken);
    return res.redirect(sanitizeAdminNextPath(parsed.data.next));
  } catch (error) {
    clearAdminAuthCookie(res);

    return res.status(error.statusCode || 500).render(
      "admin/login",
      buildLoginViewModel({
        alert: {
          type: "danger",
          title:
            error.statusCode === 403 ? "Admin role required" : "Login unsuccessful",
          message: error.message || "Unable to sign in to the admin dashboard.",
        },
        formData: parsed.data,
        nextPath,
      })
    );
  }
};

const handleLogout = (req, res) => {
  clearAdminAuthCookie(res);
  return res.redirect(buildAdminLoginUrl({ reason: "logged_out" }));
};

const renderDashboard = asyncHandler(async (req, res) => {
  return renderDashboardPage(req, res);
});

const renderDestinationsPage = asyncHandler(async (req, res) => {
  return renderDestinationsPageWithAlert(req, res);
});

const renderAttractionAssetsPage = asyncHandler(async (req, res) => {
  return renderAttractionAssetsPageWithAlert(req, res);
});

const updateDestinationState = asyncHandler(async (req, res) => {
  const isActive = coerceFormBoolean(req.body?.isActive, false);
  const destination = await adminWebService.setDestinationActiveState(
    req.params.destinationId,
    isActive
  );

  return renderDestinationsPageWithAlert(req, res, {
    alert: {
      type: "success",
      title: "Destination updated",
      message: `${destination.name} is now ${destination.isActive ? "enabled" : "disabled"}.`,
    },
  });
});

const runDestinationEnrichment = asyncHandler(async (req, res) => {
  const result = await adminWebService.enrichDestination(req.params.destinationId);

  return renderDestinationsPageWithAlert(req, res, {
    alert: {
      type: "success",
      title: "Destination enrichment completed",
      message: `Processed ${result.attemptedCount} attractions: ${result.enrichedCount} enriched, ${result.needsReviewCount} need review, ${result.failedCount} failed.`,
    },
  });
});

const runDestinationPhotoBackfill = asyncHandler(async (req, res) => {
  const result = await adminWebService.backfillDestinationPhotos(req.params.destinationId, {
    force: coerceFormBoolean(req.body?.force, false),
  });

  return renderDestinationsPageWithAlert(req, res, {
    alert: {
      type: "success",
      title: "Destination photo backfill completed",
      message: `Processed ${result.attemptedCount} attractions: ${result.updatedCount} updated, ${result.skippedCount} skipped, ${result.failedCount} failed.`,
    },
  });
});

const uploadAttractionAssets = asyncHandler(async (req, res) => {
  const result = await adminWebService.uploadAttractionAssets(req.params.attractionId, {
    mainImage: Array.isArray(req.files?.mainImage) ? req.files.mainImage[0] : null,
    thumbnailImage: Array.isArray(req.files?.thumbnailImage) ? req.files.thumbnailImage[0] : null,
  }, {
    baseUrl: req.app?.locals?.publicBaseUrl || `${req.protocol}://${req.get("host")}`,
  });
  req.query = {
    destinationId: req.body?.destinationId || "",
    imageState: req.body?.imageState || "all",
    limit: req.body?.limit || "24",
    page: req.body?.page || "1",
    q: req.body?.q || "",
  };

  return renderAttractionAssetsPageWithAlert(req, res, {
    alert: {
      type: "success",
      title: "Attraction assets updated",
      message: `${result.name} now points to uploaded local asset URLs.`,
    },
  });
});

const renderPendingEnrichmentShell = asyncHandler(async (req, res) => {
  return renderPendingEnrichmentPageWithAlert(req, res);
});

const runPendingAttractionEnrichment = asyncHandler(async (req, res) => {
  const result = await adminWebService.enrichPendingAttraction(req.params.attractionId);

  return renderPendingEnrichmentPageWithAlert(req, res, {
    alert: {
      type: result.outcome === "failed" ? "danger" : "success",
      title: "Attraction enrichment processed",
      message:
        result.outcome === "enriched"
          ? `${result.attraction.name} was enriched successfully.`
          : result.reason || result.error || `${result.attraction.name} requires review.`,
    },
  });
});

const runPendingBatchEnrichment = asyncHandler(async (req, res) => {
  const filters = normalizePendingPageFilters(req.body);
  const result = await adminWebService.enrichPendingBatch(filters);
  req.query = {
    ...req.query,
    ...filters,
  };

  return renderPendingEnrichmentPageWithAlert(req, res, {
    alert: {
      type: result.failedCount > 0 ? "warning" : "success",
      title: "Batch enrichment processed",
      message: `Processed ${result.attemptedCount} attractions: ${result.enrichedCount} enriched, ${result.needsReviewCount} need review, ${result.failedCount} failed.`,
    },
  });
});

const runPendingAttractionPhotoBackfill = asyncHandler(async (req, res) => {
  const result = await adminWebService.backfillPendingAttractionPhotos(
    req.params.attractionId,
    {
      force: coerceFormBoolean(req.body?.force, false),
    }
  );

  return renderPendingEnrichmentPageWithAlert(req, res, {
    alert: {
      type: result.failedCount > 0 ? "warning" : "success",
      title: "Attraction photo backfill processed",
      message: `Processed ${result.attemptedCount} attraction: ${result.updatedCount} updated, ${result.skippedCount} skipped, ${result.failedCount} failed.`,
    },
  });
});

const runPendingBatchPhotoBackfill = asyncHandler(async (req, res) => {
  const filters = normalizePendingPageFilters(req.body);
  const result = await adminWebService.backfillPendingBatchPhotos({
    destinationId: filters.destinationId || null,
    limit: filters.limit,
    force: coerceFormBoolean(req.body?.force, false),
  });
  req.query = {
    ...req.query,
    ...filters,
  };

  return renderPendingEnrichmentPageWithAlert(req, res, {
    alert: {
      type: result.failedCount > 0 ? "warning" : "success",
      title: "Batch photo backfill processed",
      message: `Processed ${result.attemptedCount} attractions: ${result.updatedCount} updated, ${result.skippedCount} skipped, ${result.failedCount} failed.`,
    },
  });
});

const renderPendingReviewPage = asyncHandler(async (req, res) => {
  return renderPendingReviewPageWithAlert(req, res, req.params.attractionId);
});

const resolvePendingReview = asyncHandler(async (req, res) => {
  const result = await adminWebService.resolvePendingReview(
    req.params.attractionId,
    req.body?.placeId
  );

  return renderPendingEnrichmentPageWithAlert(req, res, {
    alert: {
      type: "success",
      title: "Review resolved",
      message: `${result.attraction.name} is now attached to the selected Google place.`,
    },
  });
});

const rejectPendingReview = asyncHandler(async (req, res) => {
  const result = await adminWebService.rejectPendingReview(
    req.params.attractionId,
    req.body?.reason || "Manual review rejected all candidate matches."
  );

  return renderPendingEnrichmentPageWithAlert(req, res, {
    alert: {
      type: "warning",
      title: "Review rejected",
      message: result.reason || `${result.attraction.name} was marked as failed.`,
    },
  });
});

const renderAdminNotFound = (req, res) =>
  res.status(404).render("admin/error", {
    ...buildBaseViewModel({
      activeNav: "dashboard",
      adminUser: req.adminAuth || null,
      pageTitle: "Admin Page Not Found",
    }),
    errorMessage: "The requested admin page does not exist.",
    errorTitle: "Page not found",
    statusCode: 404,
  });

const handleAdminWebError = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error?.statusCode || 500;
  const errorTitle =
    statusCode === 403
      ? "Access denied"
      : statusCode === 404
        ? "Page not found"
        : "Admin page error";

  if (req.originalUrl.startsWith("/admin/login")) {
    clearAdminAuthCookie(res);

    return res.status(statusCode).render(
      "admin/login",
      buildLoginViewModel({
        alert: {
          type: "danger",
          title: errorTitle,
          message: error.message || "Unable to load the admin login page.",
        },
        formData: req.body,
        nextPath: req.body?.next || req.query?.next,
      })
    );
  }

  return res.status(statusCode).render("admin/error", {
    ...buildBaseViewModel({
      activeNav: "dashboard",
      adminUser: req.adminAuth || null,
      alert: {
        type: "danger",
        title: errorTitle,
        message: error.message || "Unexpected admin page failure.",
      },
      pageTitle: "Admin Error",
    }),
    errorMessage: error.message || "Unexpected admin page failure.",
    errorTitle,
    statusCode,
  });
};

module.exports = {
  handleAdminWebError,
  handleLogin,
  handleLogout,
  renderAdminNotFound,
  renderAttractionAssetsPage,
  renderDashboard,
  renderDestinationsPage,
  renderLoginPage,
  renderPendingEnrichmentShell,
  renderPendingReviewPage,
  resolvePendingReview,
  rejectPendingReview,
  runPendingAttractionEnrichment,
  runPendingAttractionPhotoBackfill,
  runPendingBatchEnrichment,
  runPendingBatchPhotoBackfill,
  runDestinationEnrichment,
  runDestinationPhotoBackfill,
  uploadAttractionAssets,
  updateDestinationState,
};
