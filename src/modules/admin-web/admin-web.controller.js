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

const renderPendingEnrichmentShell = asyncHandler(async (req, res) => {
  const dashboardData = await adminWebService.getDashboardData();

  return res.render("admin/pending-placeholder", {
    ...buildBaseViewModel({
      activeNav: "pending-enrichment",
      adminUser: req.adminAuth,
      pageTitle: "Pending Enrichment",
    }),
    buildPageHref: () => "#",
    pagination: {
      page: 1,
      totalPages: 1,
    },
    runtimeStatus: dashboardData.runtimeStatus,
    runtimeStatusTone: getRuntimeStatusTone(dashboardData.runtimeStatus.status),
    summary: dashboardData.summary,
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
  renderDashboard,
  renderDestinationsPage,
  renderLoginPage,
  renderPendingEnrichmentShell,
  runDestinationEnrichment,
  runDestinationPhotoBackfill,
  updateDestinationState,
};
