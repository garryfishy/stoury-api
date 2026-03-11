const { Op, UniqueConstraintError } = require("sequelize");
const { getDb, getRequiredModel, withTransaction } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  buildPaginationMeta,
  getPaginationOffset,
  normalizePagination,
} = require("../../utils/pagination");
const { googlePlacesClient: defaultGooglePlacesClient } = require("../../services/google-places");
const {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_PENDING_LIMIT,
  DEFAULT_STALE_DAYS,
  GOOGLE_ENRICHMENT_SOURCE,
  GOOGLE_TEXT_SEARCH_RADIUS_METERS,
  MAX_BATCH_LIMIT,
  MAX_PENDING_LIMIT,
  buildGoogleSearchQuery,
  getAttractionCoordinates,
  hasEnrichmentStateAttributes,
  serializeAdminAttraction,
  pickEnrichmentMatch,
} = require("./admin-attractions.helpers");

const createAdminAttractionsService = ({
  dbProvider = getDb,
  googlePlacesClient = defaultGooglePlacesClient,
} = {}) => {
  const getModels = (db) => ({
    Attraction: getRequiredModel(db, "Attraction"),
    Destination: getRequiredModel(db, "Destination"),
  });

  const supportsStateTracking = (Attraction) => hasEnrichmentStateAttributes(Attraction);

  const assertDestinationExists = async (Destination, destinationId, transaction) => {
    if (!destinationId) {
      return null;
    }

    const destination = await Destination.findByPk(destinationId, { transaction });

    if (!destination) {
      throw new AppError("Destination not found.", 422);
    }

    return destination;
  };

  const loadDestinationMap = async (Destination, attractions, transaction) => {
    const destinationIds = [
      ...new Set(
        attractions
          .map((attraction) => readRecordValue(attraction, ["destinationId"]))
          .filter(Boolean)
      ),
    ];

    if (!destinationIds.length) {
      return new Map();
    }

    const destinations = await Destination.findAll({
      where: {
        id: destinationIds,
      },
      transaction,
    });

    return new Map(destinations.map((destination) => [readRecordValue(destination, ["id"]), destination]));
  };

  const toBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }

    if (typeof value === "boolean") {
      return value;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }

    return defaultValue;
  };

  const toPositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.min(Math.trunc(parsed), max);
  };

  const resolveEffectiveStatus = (filters = {}) => {
    if (filters.status) {
      return filters.status;
    }

    return filters.staleOnly ? null : "pending";
  };

  const normalizePendingFilters = (filters = {}) => {
    const pagination = normalizePagination({
      page: filters.page,
      limit: filters.limit,
      defaultLimit: DEFAULT_PENDING_LIMIT,
    });

    return {
      destinationId: filters.destinationId || null,
      status: filters.status || null,
      staleOnly: toBoolean(filters.staleOnly, false),
      staleDays: toPositiveInteger(filters.staleDays, DEFAULT_STALE_DAYS, 365),
      page: pagination.page,
      limit: Math.min(pagination.limit, MAX_PENDING_LIMIT),
    };
  };

  const normalizeBatchFilters = (filters = {}) => ({
    destinationId: filters.destinationId || null,
    limit: toPositiveInteger(filters.limit, DEFAULT_BATCH_LIMIT, MAX_BATCH_LIMIT),
    dryRun: toBoolean(filters.dryRun, false),
    staleOnly: toBoolean(filters.staleOnly, false),
    staleDays: toPositiveInteger(filters.staleDays, DEFAULT_STALE_DAYS, 365),
  });

  const buildPendingWhere = (Attraction, filters) => {
    const hasState = supportsStateTracking(Attraction);
    const where = {
      isActive: true,
    };
    const effectiveStatus = resolveEffectiveStatus(filters);

    if (filters.destinationId) {
      where.destinationId = filters.destinationId;
    }

    if (hasState && effectiveStatus) {
      where.enrichmentStatus = effectiveStatus;
    } else if (effectiveStatus === "pending") {
      where.externalPlaceId = null;
    } else if (effectiveStatus === "enriched") {
      where.externalPlaceId = {
        [Op.ne]: null,
      };
    } else {
      where.id = null;
    }

    if (filters.staleOnly) {
      const staleCutoff = new Date(
        Date.now() - Number(filters.staleDays) * 24 * 60 * 60 * 1000
      );

      where[Op.and] = [
        {
          [Op.or]: [
            {
              externalLastSyncedAt: null,
            },
            {
              externalLastSyncedAt: {
                [Op.lt]: staleCutoff,
              },
            },
          ],
        },
      ];
    }

    return where;
  };

  const findPendingAttractions = async (db, filters, transaction) => {
    const { Attraction, Destination } = getModels(db);
    const where = buildPendingWhere(Attraction, filters);

    if (filters.destinationId) {
      await assertDestinationExists(Destination, filters.destinationId, transaction);
    }

    const total = await Attraction.count({
      where,
      transaction,
    });
    const attractions = await Attraction.findAll({
      where,
      order: [["name", "ASC"]],
      limit: filters.limit,
      offset: getPaginationOffset(filters),
      transaction,
    });
    const destinationMap = await loadDestinationMap(Destination, attractions, transaction);
    const hasState = supportsStateTracking(Attraction);

    return {
      items: attractions.map((attraction) =>
        serializeAdminAttraction(
          attraction,
          destinationMap.get(readRecordValue(attraction, ["destinationId"])) || null,
          { hasStateAttributes: hasState }
        )
      ),
      rawAttractions: attractions,
      destinationMap,
      hasState,
      total,
    };
  };

  const loadAttractionContext = async (db, attractionId, transaction) => {
    const { Attraction, Destination } = getModels(db);
    const attraction = await Attraction.findByPk(attractionId, { transaction });

    if (!attraction) {
      throw new AppError("Attraction not found.", 404);
    }

    const destination = await Destination.findByPk(
      readRecordValue(attraction, ["destinationId"]),
      { transaction }
    );

    return {
      Attraction,
      Destination,
      attraction,
      destination,
      hasState: supportsStateTracking(Attraction),
    };
  };

  const projectAttractionRecord = (record, values = {}) => ({
    ...(typeof record?.toJSON === "function" ? record.toJSON() : record),
    ...values,
  });

  const buildOutcomePayload = ({
    attraction,
    destination,
    hasState,
    query,
    outcome,
    reason = null,
    error = null,
    candidateCount = 0,
    candidates = [],
    selectedPlace = null,
    projectedAttraction = null,
  }) => ({
    attraction: serializeAdminAttraction(projectedAttraction || attraction, destination, {
      hasStateAttributes: hasState,
    }),
    outcome,
    query,
    candidateCount,
    candidates,
    selectedPlace,
    error,
    reason,
  });

  const updateEnrichmentState = async (
    attraction,
    { hasState, transaction, values = {} } = {}
  ) => {
    const updateValues = { ...values };

    if (!hasState) {
      delete updateValues.enrichmentStatus;
      delete updateValues.enrichmentError;
      delete updateValues.enrichmentAttemptedAt;
    }

    if (!Object.keys(updateValues).length) {
      return attraction;
    }

    try {
      await attraction.update(updateValues, { transaction });
      return attraction;
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError(
          "This Google place is already attached to another attraction.",
          409
        );
      }

      throw error;
    }
  };

  const assertNoDuplicateExternalPlace = async (
    Attraction,
    attractionId,
    placeId,
    transaction
  ) => {
    const duplicate = await Attraction.findOne({
      where: {
        externalSource: GOOGLE_ENRICHMENT_SOURCE,
        externalPlaceId: placeId,
        id: {
          [Op.ne]: attractionId,
        },
      },
      transaction,
    });

    if (duplicate) {
      throw new AppError(
        "This Google place is already attached to another attraction.",
        409
      );
    }
  };

  const runSingleEnrichment = async (
    db,
    attractionId,
    { dryRun = false, transaction = null, conflictAsFailure = false } = {}
  ) => {
    const { attraction, destination, hasState, Attraction } = await loadAttractionContext(
      db,
      attractionId,
      transaction
    );
    const query = buildGoogleSearchQuery({ attraction, destination });
    const location = getAttractionCoordinates(attraction);
    const attemptedAt = new Date();

    try {
      const candidates = await googlePlacesClient.textSearch({
        query,
        location,
        radiusMeters: GOOGLE_TEXT_SEARCH_RADIUS_METERS,
      });
      const match = pickEnrichmentMatch({
        attraction,
        candidates,
      });

      if (match.outcome === "failed") {
        const failureValues = {
          enrichmentStatus: "failed",
          enrichmentError: match.reason,
          enrichmentAttemptedAt: attemptedAt,
        };

        if (!dryRun) {
          await updateEnrichmentState(attraction, {
            hasState,
            transaction,
            values: failureValues,
          });
        }

        return buildOutcomePayload({
          attraction,
          destination,
          hasState,
          query,
          outcome: "failed",
          reason: match.reason,
          error: match.reason,
          candidateCount: match.candidateCount,
          candidates: match.candidates,
          projectedAttraction: dryRun
            ? projectAttractionRecord(attraction, failureValues)
            : attraction,
        });
      }

      if (match.outcome === "needs_review") {
        const reviewValues = {
          enrichmentStatus: "needs_review",
          enrichmentError: null,
          enrichmentAttemptedAt: attemptedAt,
        };

        if (!dryRun) {
          await updateEnrichmentState(attraction, {
            hasState,
            transaction,
            values: reviewValues,
          });
        }

        return buildOutcomePayload({
          attraction,
          destination,
          hasState,
          query,
          outcome: "needs_review",
          reason: match.reason,
          candidateCount: match.candidateCount,
          candidates: match.candidates,
          projectedAttraction: dryRun
            ? projectAttractionRecord(attraction, reviewValues)
            : attraction,
        });
      }

      const details = await googlePlacesClient.getPlaceDetails(
        match.selectedCandidate.placeId
      );

      try {
        await assertNoDuplicateExternalPlace(
          Attraction,
          readRecordValue(attraction, ["id"]),
          details.placeId,
          transaction
        );
      } catch (error) {
        if (conflictAsFailure) {
          const conflictValues = {
            enrichmentStatus: "failed",
            enrichmentError: error.message,
            enrichmentAttemptedAt: attemptedAt,
          };

          if (!dryRun) {
            await updateEnrichmentState(attraction, {
              hasState,
              transaction,
              values: conflictValues,
            });
          }

          return buildOutcomePayload({
            attraction,
            destination,
            hasState,
            query,
            outcome: "failed",
            error: error.message,
            reason: error.message,
            candidateCount: match.candidateCount,
            candidates: match.candidates,
            projectedAttraction: dryRun
              ? projectAttractionRecord(attraction, conflictValues)
              : attraction,
          });
        }

        throw error;
      }

      const enrichmentValues = {
        externalSource: GOOGLE_ENRICHMENT_SOURCE,
        externalPlaceId: details.placeId,
        externalRating: details.rating,
        externalReviewCount: details.userRatingsTotal,
        externalLastSyncedAt: attemptedAt,
        enrichmentStatus: "enriched",
        enrichmentError: null,
        enrichmentAttemptedAt: attemptedAt,
      };

      if (!dryRun) {
        await updateEnrichmentState(attraction, {
          hasState,
          transaction,
          values: enrichmentValues,
        });
      }

      return buildOutcomePayload({
        attraction,
        destination,
        hasState,
        query,
        outcome: "enriched",
        candidateCount: match.candidateCount,
        candidates: match.candidates,
        selectedPlace: details,
        projectedAttraction: dryRun
          ? projectAttractionRecord(attraction, enrichmentValues)
          : attraction,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const failureMessage = error?.message || "Google Places lookup failed.";
      const failureValues = {
        enrichmentStatus: "failed",
        enrichmentError: failureMessage,
        enrichmentAttemptedAt: attemptedAt,
      };

      if (!dryRun) {
        await updateEnrichmentState(attraction, {
          hasState,
          transaction,
          values: failureValues,
        });
      }

      return buildOutcomePayload({
        attraction,
        destination,
        hasState,
        query,
        outcome: "failed",
        error: failureMessage,
        reason: failureMessage,
        projectedAttraction: dryRun
          ? projectAttractionRecord(attraction, failureValues)
          : attraction,
      });
    }
  };

  return {
    async listPendingEnrichment(filters) {
      const db = dbProvider();
      const normalizedFilters = normalizePendingFilters(filters);
      const { items, total } = await findPendingAttractions(db, normalizedFilters);
      const effectiveStatus = resolveEffectiveStatus(normalizedFilters);

      return {
        items,
        total,
        pagination: buildPaginationMeta({
          page: normalizedFilters.page,
          limit: normalizedFilters.limit,
          total,
        }),
        filtersApplied: {
          destinationId: normalizedFilters.destinationId,
          status: effectiveStatus,
          limit: normalizedFilters.limit,
          page: normalizedFilters.page,
          staleOnly: normalizedFilters.staleOnly,
          staleDays: normalizedFilters.staleDays,
        },
      };
    },

    async enrichAttraction(attractionId) {
      const db = dbProvider();

      return withTransaction(
        async (transaction) =>
          runSingleEnrichment(db, attractionId, { dryRun: false, transaction }),
        db
      );
    },

    async enrichMissing(payload) {
      const db = dbProvider();
      const normalizedPayload = normalizeBatchFilters(payload);
      const selectionFilters = {
        destinationId: normalizedPayload.destinationId,
        limit: normalizedPayload.limit,
        staleOnly: normalizedPayload.staleOnly,
        staleDays: normalizedPayload.staleDays,
        status: normalizedPayload.staleOnly ? undefined : "pending",
      };
      const { rawAttractions } = await findPendingAttractions(db, selectionFilters);
      const results = [];

      for (const attraction of rawAttractions) {
        try {
          const result = await withTransaction(
            async (transaction) =>
              runSingleEnrichment(db, readRecordValue(attraction, ["id"]), {
                dryRun: normalizedPayload.dryRun,
                transaction,
                conflictAsFailure: true,
              }),
            db
          );

          results.push(result);
        } catch (error) {
          results.push({
            attraction: {
              id: readRecordValue(attraction, ["id"]),
            },
            outcome: "failed",
            query: null,
            candidateCount: 0,
            candidates: [],
            selectedPlace: null,
            error: error.message || "Batch enrichment failed for this attraction.",
            reason: error.message || "Batch enrichment failed for this attraction.",
          });
        }
      }

      return {
        dryRun: normalizedPayload.dryRun,
        attemptedCount: results.length,
        enrichedCount: results.filter((result) => result.outcome === "enriched").length,
        needsReviewCount: results.filter((result) => result.outcome === "needs_review").length,
        failedCount: results.filter((result) => result.outcome === "failed").length,
        results,
      };
    },
  };
};

const adminAttractionsService = createAdminAttractionsService();

module.exports = {
  adminAttractionsService,
  createAdminAttractionsService,
};
