const { Op } = require("sequelize");
const { AppError } = require("../../utils/app-error");
const { getDb, getRequiredModel } = require("../../database/db-context");
const { readRecordValue } = require("../../utils/model-helpers");
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
const { serializeDestination } = require("../destinations/destinations.helpers");
const {
  assertUploadFileSupported,
  buildAttractionAssetUploadPath,
  buildAttractionAssetUrl,
  buildUploadMetadata,
  hasUsableAttractionImage,
  inferFileExtension,
  slugify,
  writeUploadedImage,
} = require("./admin-web.assets");

const DEFAULT_ASSET_PAGE_LIMIT = 24;

const normalizeAssetPageFilters = (filters = {}) => ({
  destinationId: filters.destinationId ? String(filters.destinationId).trim() : "",
  imageState: ["all", "with_image", "without_image"].includes(String(filters.imageState || "all"))
    ? String(filters.imageState || "all")
    : "all",
  page: Math.max(1, Number.parseInt(filters.page || "1", 10) || 1),
  limit: Math.min(
    100,
    Math.max(1, Number.parseInt(filters.limit || String(DEFAULT_ASSET_PAGE_LIMIT), 10) || DEFAULT_ASSET_PAGE_LIMIT)
  ),
  q: filters.q ? String(filters.q).trim() : "",
});

const buildAttractionAssetRow = (attraction, destination) => ({
  destination: serializeDestination(destination),
  fullAddress: readRecordValue(attraction, ["fullAddress"], ""),
  hasUsableImage: hasUsableAttractionImage(attraction),
  id: readRecordValue(attraction, ["id"]),
  mainImageUrl: readRecordValue(attraction, ["mainImageUrl"], null),
  name: readRecordValue(attraction, ["name"], ""),
  slug: readRecordValue(attraction, ["slug"], ""),
  thumbnailImageUrl: readRecordValue(attraction, ["thumbnailImageUrl"], null),
  uploadedSourceProvider:
    readRecordValue(attraction, ["metadata", "assetSource", "provider"], null) || null,
});

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
              [Op.or]: [
                { thumbnailImageUrl: null },
                { mainImageUrl: null },
                {
                  thumbnailImageUrl: {
                    [Op.iLike]: "%/api/attractions/%/photo%",
                  },
                },
                {
                  mainImageUrl: {
                    [Op.iLike]: "%/api/attractions/%/photo%",
                  },
                },
                {
                  thumbnailImageUrl: {
                    [Op.iLike]: "%googleapis.com/maps/api/place/photo%",
                  },
                },
                {
                  mainImageUrl: {
                    [Op.iLike]: "%googleapis.com/maps/api/place/photo%",
                  },
                },
                {
                  thumbnailImageUrl: {
                    [Op.iLike]: "%.pdf%",
                  },
                },
                {
                  mainImageUrl: {
                    [Op.iLike]: "%.pdf%",
                  },
                },
                {
                  thumbnailImageUrl: {
                    [Op.iLike]: "%.svg%",
                  },
                },
                {
                  mainImageUrl: {
                    [Op.iLike]: "%.svg%",
                  },
                },
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

  async getAttractionAssetsPageData(filters = {}) {
    const db = dbProvider();
    const Attraction = getRequiredModel(db, "Attraction");
    const Destination = getRequiredModel(db, "Destination");
    const normalizedFilters = normalizeAssetPageFilters(filters);
    const destinations = await Destination.findAll({
      order: [["name", "ASC"]],
    });
    const destinationById = new Map(
      destinations.map((destination) => [readRecordValue(destination, ["id"]), destination])
    );
    const where = {
      isActive: true,
    };

    if (normalizedFilters.destinationId) {
      where.destinationId = normalizedFilters.destinationId;
    }

    if (normalizedFilters.q) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]: `%${normalizedFilters.q}%`,
          },
        },
        {
          slug: {
            [Op.iLike]: `%${normalizedFilters.q}%`,
          },
        },
        {
          fullAddress: {
            [Op.iLike]: `%${normalizedFilters.q}%`,
          },
        },
      ];
    }

    const attractions = await Attraction.findAll({
      where,
      order: [["name", "ASC"]],
    });

    const filteredRows = attractions
      .map((attraction) => {
        const destination = destinationById.get(readRecordValue(attraction, ["destinationId"]));

        if (!destination) {
          return null;
        }

        return buildAttractionAssetRow(attraction, destination);
      })
      .filter(Boolean)
      .filter((row) => {
        if (normalizedFilters.imageState === "with_image") {
          return row.hasUsableImage;
        }

        if (normalizedFilters.imageState === "without_image") {
          return !row.hasUsableImage;
        }

        return true;
      });

    const total = filteredRows.length;
    const offset = (normalizedFilters.page - 1) * normalizedFilters.limit;
    const items = filteredRows.slice(offset, offset + normalizedFilters.limit);

    return {
      destinationOptions: destinations.map((destination) => serializeDestination(destination)),
      filters: normalizedFilters,
      items,
      pagination: {
        limit: normalizedFilters.limit,
        page: normalizedFilters.page,
        total,
        totalPages: total ? Math.ceil(total / normalizedFilters.limit) : 0,
      },
      runtimeStatus: runtimeStatusProvider(),
      summary: (await this.getDashboardData()).summary,
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

  async backfillPendingAttractionPhotos(attractionId, { force = false } = {}) {
    return enrichmentService.backfillPhotos({
      attractionId,
      limit: 1,
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

  async backfillPendingBatchPhotos(filters = {}) {
    return enrichmentService.backfillPhotos({
      destinationId: filters.destinationId || null,
      attractionId: filters.attractionId || null,
      limit: filters.limit || 25,
      dryRun: false,
      force: filters.force || false,
    });
  },

  async resolvePendingReview(attractionId, placeId) {
    return enrichmentService.resolveReview(attractionId, placeId);
  },

  async rejectPendingReview(attractionId, reason) {
    return enrichmentService.rejectReview(attractionId, reason);
  },

  async uploadAttractionAssets(attractionId, files = {}, { baseUrl } = {}) {
    const db = dbProvider();
    const Attraction = getRequiredModel(db, "Attraction");
    const Destination = getRequiredModel(db, "Destination");
    const attraction = await Attraction.findByPk(attractionId);

    if (!attraction || !readRecordValue(attraction, ["isActive"], false)) {
      throw new AppError("Attraction not found.", 404);
    }

    const destination = await Destination.findByPk(
      readRecordValue(attraction, ["destinationId"], null)
    );

    if (!destination) {
      throw new AppError("Destination not found.", 404);
    }

    const mainFile = files.mainImage || null;
    const thumbnailFile = files.thumbnailImage || null;

    if (!mainFile && !thumbnailFile) {
      throw new AppError("Upload at least one image file.", 422);
    }

    assertUploadFileSupported(mainFile);
    assertUploadFileSupported(thumbnailFile);

    const destinationSlug = slugify(readRecordValue(destination, ["slug"], "destination"));
    const attractionSlug = slugify(readRecordValue(attraction, ["slug"], attractionId));
    const timestamp = Date.now();
    const effectiveMainFile = mainFile || thumbnailFile;
    const effectiveThumbnailFile = thumbnailFile || mainFile || effectiveMainFile;
    const mainRelativePath = buildAttractionAssetUploadPath({
      attractionSlug,
      destinationSlug,
      extension: inferFileExtension(effectiveMainFile),
      timestamp,
      variant: "main",
    });
    const thumbnailRelativePath = buildAttractionAssetUploadPath({
      attractionSlug,
      destinationSlug,
      extension: inferFileExtension(effectiveThumbnailFile),
      timestamp,
      variant: "thumbnail",
    });

    await Promise.all([
      writeUploadedImage({ file: effectiveMainFile, relativePath: mainRelativePath }),
      writeUploadedImage({ file: effectiveThumbnailFile, relativePath: thumbnailRelativePath }),
    ]);

    await attraction.update({
      mainImageUrl: buildAttractionAssetUrl({
        relativePath: mainRelativePath,
        baseUrl,
      }),
      thumbnailImageUrl: buildAttractionAssetUrl({
        relativePath: thumbnailRelativePath,
        baseUrl,
      }),
      metadata: buildUploadMetadata({
        attraction,
        mainFile,
        thumbnailFile,
        timestamp,
      }),
    });

    return buildAttractionAssetRow(attraction, destination);
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
