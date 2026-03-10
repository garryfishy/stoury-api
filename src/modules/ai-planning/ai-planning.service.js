const { Op } = require("sequelize");
const { dateDiffInDaysInclusive } = require("../../utils/date");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const { getDb, getRequiredModel } = require("../../database/db-context");
const {
  loadAttractionCategoriesByAttractionIds,
} = require("../attractions/attractions.helpers");
const {
  DEFAULT_DAY_START_MINUTES,
  DEFAULT_DAY_END_MINUTES,
  DEFAULT_ITEM_BUFFER_MINUTES,
  DEFAULT_MAX_ITEMS_PER_DAY,
  findSchedulableWindow,
  getDateOnlyForTripDay,
  minutesToTimeString,
  serializeAttractionSummary,
} = require("../itineraries/itineraries.helpers");
const {
  buildPlanningStrategy,
  buildPreviewPayload,
  getPreferredAttractionCategorySlugs,
  scoreAttractionCandidate,
  sortCandidatesDeterministically,
} = require("./ai-planning.helpers");
const {
  buildBudgetAnalysis,
  getBudgetNumber,
  getPerDayBudget,
} = require("./ai-planning.budget");
const {
  normalizeProviderRanking,
} = require("./ai-planning.providers");
const { createAiPlanningProvider } = require("./ai-planning.factory");
const { aiPlanningPreviewSchema } = require("./ai-planning.validators");

const createAiPlanningService = ({
  dbProvider = getDb,
  planningProvider = createAiPlanningProvider(),
} = {}) => {
  const getAiPlanningModels = (db) => ({
    Attraction: getRequiredModel(db, "Attraction"),
    Trip: getRequiredModel(db, "Trip"),
    TripPreferenceCategory: getRequiredModel(db, "TripPreferenceCategory"),
  });

  const assertTripOwnership = async (Trip, userId, tripId) => {
    const trip = await Trip.findOne({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      throw new AppError("Trip not found.", 404);
    }

    return trip;
  };

  const loadTripPreferences = async (db, tripId) => {
    const TripPreferenceCategory = getRequiredModel(db, "TripPreferenceCategory");
    const PreferenceCategory = getRequiredModel(db, "PreferenceCategory");
    const mappings = await TripPreferenceCategory.findAll({
      where: { tripId },
    });
    const categoryIds = mappings
      .map((mapping) => readRecordValue(mapping, ["preferenceCategoryId"]))
      .filter(Boolean);

    if (!categoryIds.length) {
      return [];
    }

    return PreferenceCategory.findAll({
      where: {
        id: {
          [Op.in]: categoryIds,
        },
        isActive: true,
      },
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    });
  };

  const loadDestinationCandidates = async (db, destinationId) => {
    const Attraction = getRequiredModel(db, "Attraction");
    const attractions = await Attraction.findAll({
      where: {
        destinationId,
        isActive: true,
      },
      order: [["name", "ASC"]],
    });
    const attractionIds = attractions
      .map((attraction) => readRecordValue(attraction, ["id"]))
      .filter(Boolean);
    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      attractionIds
    );

    return attractions.map((attraction) => ({
      attraction,
      categories:
        categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [],
    }));
  };

  const buildRankedCandidates = async ({
    trip,
    preferences,
    destinationCandidates,
  }) => {
    const preferredCategorySlugs = getPreferredAttractionCategorySlugs(preferences);
    const scoredCandidates = destinationCandidates.map(({ attraction, categories }) =>
      scoreAttractionCandidate({
        attraction,
        categories,
        preferredCategorySlugs,
      })
    );
    const deterministicCandidates = sortCandidatesDeterministically(scoredCandidates);
    const providerInput = deterministicCandidates.map((candidate) => ({
      attractionId: candidate.attractionId,
      name: readRecordValue(candidate.attraction, ["name"], ""),
      categorySlugs: candidate.categorySlugs,
      rating: candidate.rating,
      estimatedDurationMinutes: candidate.durationMinutes,
    }));
    const tripDurationDays = dateDiffInDaysInclusive(
      readRecordValue(trip, ["startDate"]),
      readRecordValue(trip, ["endDate"])
    );
    const budgetValue = getBudgetNumber(readRecordValue(trip, ["budget"], null));

    const providerResult = await planningProvider.rankCandidates({
      trip: {
        tripId: readRecordValue(trip, ["id"]),
        destinationId: readRecordValue(trip, ["destinationId"]),
        startDate: readRecordValue(trip, ["startDate"], ""),
        endDate: readRecordValue(trip, ["endDate"], ""),
        budget: readRecordValue(trip, ["budget"], null),
        budgetPerDay:
          budgetValue === null
            ? null
            : getPerDayBudget(budgetValue, tripDurationDays),
      },
      preferences: preferences.map((preference) => ({
        id: readRecordValue(preference, ["id"]),
        slug: readRecordValue(preference, ["slug"], ""),
        name: readRecordValue(preference, ["name"], ""),
      })),
      candidates: providerInput,
    });
    const rankedAttractionIds = Array.isArray(providerResult)
      ? providerResult
      : Array.isArray(providerResult?.rankedAttractionIds)
        ? providerResult.rankedAttractionIds
        : [];
    const rankedCandidates = normalizeProviderRanking(
      deterministicCandidates,
      rankedAttractionIds
    );
    const usedProviderRanking =
      planningProvider.name !== "deterministic" &&
      rankedCandidates.some(
        (candidate, index) =>
          candidate.attractionId !== deterministicCandidates[index]?.attractionId
      );

    return {
      preferredCategorySlugs,
      rankedCandidates,
      providerExplanation:
        typeof providerResult?.explanation === "string"
          ? providerResult.explanation
          : null,
      usedProviderRanking,
    };
  };

  const buildWarnings = ({
    budgetWarnings = [],
    coverage,
    preferences,
    preferredCategorySlugs,
    rankedCandidates,
  }) => {
    const warnings = [];
    const matchedCandidates = rankedCandidates.filter(
      (candidate) => candidate.preferenceMatchCount > 0
    );

    if (preferences.length && !preferredCategorySlugs.size) {
      warnings.push(
        "Selected trip preferences do not have a direct attraction-category mapping yet, so the preview used destination-wide ranking."
      );
    }

    if (
      preferences.length &&
      matchedCandidates.length < coverage.requestedDayCount
    ) {
      warnings.push(
        "There were not enough strongly preference-matched attractions to fill every day, so additional curated attractions were used."
      );
    }

    if (coverage.availableAttractionCount < coverage.requestedItemSlots) {
      warnings.push(
        `Only ${coverage.availableAttractionCount} curated attractions were available for ${coverage.requestedItemSlots} recommended itinerary slots (${coverage.requestedDayCount} day(s) x ${coverage.maxItemsPerDay} items/day). The preview includes partial days where needed.`
      );
    } else if (coverage.scheduledItemCount < coverage.requestedItemSlots) {
      warnings.push(
        `The scheduler placed ${coverage.scheduledItemCount} of ${coverage.requestedItemSlots} recommended itinerary slots after applying duration and opening-hours constraints. Partial days are marked with isPartial: true.`
      );
    }

    return [...warnings, ...budgetWarnings];
  };

  const buildPreviewDays = ({ trip, rankedCandidates }) => {
    const tripDurationDays = dateDiffInDaysInclusive(
      readRecordValue(trip, ["startDate"]),
      readRecordValue(trip, ["endDate"])
    );

    if (!tripDurationDays) {
      throw new AppError("Trip dates are invalid.", 422);
    }

    const remainingCandidates = [...rankedCandidates];
    const days = [];
    let scheduledItemCount = 0;

    for (let dayNumber = 1; dayNumber <= tripDurationDays; dayNumber += 1) {
      const date = getDateOnlyForTripDay(readRecordValue(trip, ["startDate"]), dayNumber);
      const items = [];
      let desiredStartMinutes = DEFAULT_DAY_START_MINUTES;

      while (
        items.length < DEFAULT_MAX_ITEMS_PER_DAY &&
        remainingCandidates.length
      ) {
        let selectedIndex = -1;
        let selectedWindow = null;

        for (let index = 0; index < remainingCandidates.length; index += 1) {
          const candidate = remainingCandidates[index];
          const window = findSchedulableWindow({
            openingHours: readRecordValue(candidate.attraction, ["openingHours"], {}),
            dateOnly: date,
            desiredStartMinutes,
            durationMinutes: candidate.durationMinutes,
            dailyStartMinutes: DEFAULT_DAY_START_MINUTES,
            dailyEndMinutes: DEFAULT_DAY_END_MINUTES,
          });

          if (window) {
            selectedIndex = index;
            selectedWindow = window;
            break;
          }
        }

        if (selectedIndex < 0 || !selectedWindow) {
          break;
        }

        const [selectedCandidate] = remainingCandidates.splice(selectedIndex, 1);

        items.push({
          attractionId: selectedCandidate.attractionId,
          attractionName: readRecordValue(
            selectedCandidate.attraction,
            ["name"],
            ""
          ),
          startTime: minutesToTimeString(selectedWindow.startMinutes),
          endTime: minutesToTimeString(selectedWindow.endMinutes),
          orderIndex: items.length + 1,
          notes: null,
          source: "ai_assisted",
          attraction: serializeAttractionSummary(
            selectedCandidate.attraction,
            selectedCandidate.categories
          ),
        });

        desiredStartMinutes =
          selectedWindow.endMinutes + DEFAULT_ITEM_BUFFER_MINUTES;
      }

      scheduledItemCount += items.length;

      days.push({
        dayNumber,
        date,
        notes: null,
        isPartial: items.length < DEFAULT_MAX_ITEMS_PER_DAY,
        items,
      });
    }

    if (!scheduledItemCount) {
      throw new AppError(
        "AI generation could not assemble any itinerary items from the available attraction hours.",
        422
      );
    }

    const coverage = {
      requestedDayCount: tripDurationDays,
      generatedDayCount: days.filter((day) => day.items.length > 0).length,
      availableAttractionCount: rankedCandidates.length,
      requestedItemSlots: tripDurationDays * DEFAULT_MAX_ITEMS_PER_DAY,
      scheduledItemCount,
      maxItemsPerDay: DEFAULT_MAX_ITEMS_PER_DAY,
    };

    return {
      days,
      isPartial: coverage.scheduledItemCount < coverage.requestedItemSlots,
      coverage,
    };
  };

  return {
    async generatePreview(userId, tripId) {
      const db = dbProvider();
      const { Trip } = getAiPlanningModels(db);
      const trip = await assertTripOwnership(Trip, userId, tripId);

      if (readRecordValue(trip, ["planningMode"]) !== "ai_assisted") {
        throw new AppError(
          "AI itinerary preview is only available for ai_assisted trips.",
          409
        );
      }

      const preferences = await loadTripPreferences(db, tripId);
      const destinationCandidates = await loadDestinationCandidates(
        db,
        readRecordValue(trip, ["destinationId"])
      );

      if (!destinationCandidates.length) {
        throw new AppError(
          "No curated attractions are available for this destination yet.",
          422
        );
      }

      const {
        preferredCategorySlugs,
        providerExplanation,
        rankedCandidates,
        usedProviderRanking,
      } =
        await buildRankedCandidates({
          trip,
          preferences,
          destinationCandidates,
        });
      const preview = buildPreviewDays({
        trip,
        rankedCandidates,
      });
      const budgetAnalysis = buildBudgetAnalysis({
        trip,
        dayCount: preview.coverage.requestedDayCount,
        isPartial: preview.isPartial,
      });
      const warnings = buildWarnings({
        budgetWarnings: budgetAnalysis.budgetWarnings,
        coverage: preview.coverage,
        preferences,
        preferredCategorySlugs,
        rankedCandidates,
      });

      return aiPlanningPreviewSchema.parse(
        buildPreviewPayload({
          budget: budgetAnalysis.budget,
          budgetFit: budgetAnalysis.budgetFit,
          budgetWarnings: budgetAnalysis.budgetWarnings,
          coverage: preview.coverage,
          isPartial: preview.isPartial,
          trip,
          preferences,
          days: preview.days,
          strategy: buildPlanningStrategy({
            providerName: planningProvider.name,
            providerExplanation,
            usedProviderRanking,
          }),
          warnings,
        })
      );
    },
  };
};

const aiPlanningService = createAiPlanningService();

module.exports = {
  aiPlanningService,
  createAiPlanningService,
};
