const { Op } = require("sequelize");
const { AppError } = require("../../utils/app-error");
const { getDb, getRequiredModel } = require("../../database/db-context");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  DEFAULT_STALE_DAYS,
  GOOGLE_ENRICHMENT_SOURCE,
} = require("../admin-attractions/admin-attractions.helpers");
const {
  getAdminEnrichmentRuntimeStatus,
} = require("../admin-attractions/admin-attractions.runtime");
const {
  adminAttractionsService,
} = require("../admin-attractions/admin-attractions.service");
const { authService } = require("../auth/auth.service");
const { serializeDestination } = require("../destinations/destinations.helpers");

const createAdminWebService = ({
  dbProvider = getDb,
  loginService = authService,
  enrichmentService = adminAttractionsService,
  runtimeStatusProvider = getAdminEnrichmentRuntimeStatus,
} = {}) => ({
  async listDestinationOptions() {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const destinations = await Destination.findAll({
      order: [["name", "ASC"]],
    });

    return destinations.map((destination) => serializeDestination(destination));
  },

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
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const Attraction = getRequiredModel(db, "Attraction");
    const staleDays = DEFAULT_STALE_DAYS;
    const [pendingResult, staleResult, needsReviewResult, destinations] = await Promise.all([
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
      Destination.findAll({
        order: [["name", "ASC"]],
      }),
    ]);

    const destinationRows = await Promise.all(
      destinations.map(async (destination) => {
        const destinationId = readRecordValue(destination, ["id"]);
        const [attractionCount, pendingCount, photoBackfillCount] = await Promise.all([
          Attraction.count({
            where: {
              destinationId,
            },
          }),
          Attraction.count({
            where: {
              destinationId,
              isActive: true,
              externalPlaceId: null,
            },
          }),
          Attraction.count({
            where: {
              destinationId,
              isActive: true,
              externalSource: GOOGLE_ENRICHMENT_SOURCE,
              externalPlaceId: {
                [Op.ne]: null,
              },
              [Op.or]: [
                { thumbnailImageUrl: null },
                { mainImageUrl: null },
              ],
            },
          }),
        ]);

        return {
          ...serializeDestination(destination),
          attractionCount,
          pendingCount,
          photoBackfillCount,
        };
      })
    );

    return {
      runtimeStatus: runtimeStatusProvider(),
      summary: {
        pendingCount: pendingResult.total,
        staleCount: staleResult.total,
        needsReviewCount: needsReviewResult.total,
        staleDays,
      },
      destinations: destinationRows,
    };
  },

  async getPendingEnrichmentPageData(filters = {}) {
    const [dashboardData, destinationOptions, pendingEnrichment] = await Promise.all([
      this.getDashboardData(),
      this.listDestinationOptions(),
      enrichmentService.listPendingEnrichment(filters),
    ]);

    return {
      ...dashboardData,
      destinationOptions,
      pendingEnrichment,
    };
  },

  async getPendingReviewPageData(attractionId, filters = {}) {
    const [pageData, review] = await Promise.all([
      this.getPendingEnrichmentPageData(filters),
      enrichmentService.getReviewCandidates(attractionId),
    ]);

    return {
      ...pageData,
      review,
    };
  },

  async setDestinationActiveState(destinationId, isActive) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const destination = await Destination.findByPk(destinationId);

    if (!destination) {
      throw new AppError("Destination not found.", 404);
    }

    await destination.update({ isActive });

    return serializeDestination(destination);
  },

  async enrichDestination(destinationId, { limit = 25 } = {}) {
    await this.ensureDestinationExists(destinationId);

    return enrichmentService.enrichMissing({
      destinationId,
      limit,
      dryRun: false,
      staleOnly: false,
      staleDays: DEFAULT_STALE_DAYS,
    });
  },

  async backfillDestinationPhotos(destinationId, { limit = 25, force = false } = {}) {
    await this.ensureDestinationExists(destinationId);

    return enrichmentService.backfillPhotos({
      destinationId,
      limit,
      dryRun: false,
      force,
    });
  },

  async enrichPendingAttraction(attractionId) {
    return enrichmentService.enrichAttraction(attractionId);
  },

  async enrichPendingBatch(filters = {}) {
    return enrichmentService.enrichMissing({
      destinationId: filters.destinationId || null,
      limit: filters.limit || 25,
      dryRun: false,
      staleOnly: filters.staleOnly || false,
      staleDays: filters.staleDays || DEFAULT_STALE_DAYS,
    });
  },

  async resolvePendingReview(attractionId, placeId) {
    return enrichmentService.resolveReview(attractionId, placeId);
  },

  async rejectPendingReview(attractionId, reason) {
    return enrichmentService.rejectReview(attractionId, reason);
  },

  async ensureDestinationExists(destinationId) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const destination = await Destination.findByPk(destinationId);

    if (!destination) {
      throw new AppError("Destination not found.", 404);
    }

    return destination;
  },
});

const adminWebService = createAdminWebService();

module.exports = {
  adminWebService,
  createAdminWebService,
};
