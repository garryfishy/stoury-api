const { AppError } = require("../../utils/app-error");
const {
  DEFAULT_STALE_DAYS,
} = require("../admin-attractions/admin-attractions.helpers");
const {
  getAdminEnrichmentRuntimeStatus,
} = require("../admin-attractions/admin-attractions.runtime");
const {
  adminAttractionsService,
} = require("../admin-attractions/admin-attractions.service");
const { authService } = require("../auth/auth.service");

const createAdminWebService = ({
  loginService = authService,
  enrichmentService = adminAttractionsService,
  runtimeStatusProvider = getAdminEnrichmentRuntimeStatus,
} = {}) => ({
  async loginAdmin(payload) {
    const authPayload = await loginService.login(payload);
    const roles = authPayload?.user?.roles || [];

    if (!roles.includes("admin")) {
      throw new AppError(
        "You do not have permission to access the admin dashboard.",
        403
      );
    }

    return authPayload;
  },

  async getDashboardData() {
    const staleDays = DEFAULT_STALE_DAYS;
    const [pendingResult, staleResult, needsReviewResult] = await Promise.all([
      enrichmentService.listPendingEnrichment({
        page: 1,
        limit: 1,
        status: "pending",
        staleOnly: false,
        staleDays,
      }),
      enrichmentService.listPendingEnrichment({
        page: 1,
        limit: 1,
        status: "enriched",
        staleOnly: true,
        staleDays,
      }),
      enrichmentService.listPendingEnrichment({
        page: 1,
        limit: 1,
        status: "needs_review",
        staleOnly: false,
        staleDays,
      }),
    ]);

    return {
      runtimeStatus: runtimeStatusProvider(),
      summary: {
        pendingCount: pendingResult.total,
        staleCount: staleResult.total,
        needsReviewCount: needsReviewResult.total,
        staleDays,
      },
    };
  },
});

const adminWebService = createAdminWebService();

module.exports = {
  adminWebService,
  createAdminWebService,
};
