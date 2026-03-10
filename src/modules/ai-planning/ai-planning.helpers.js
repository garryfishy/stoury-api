const { readRecordValue } = require("../../utils/model-helpers");
const { serializePreferenceCategory } = require("../preferences/preferences.helpers");

const PREFERENCE_TO_ATTRACTION_CATEGORY_SLUGS = {
  nature: ["beach", "nature-park", "viewpoint"],
  culture: ["heritage", "temple"],
  food: ["culinary"],
  shopping: ["shopping"],
  relaxation: ["beach", "nature-park", "viewpoint"],
  adventure: ["adventure", "nature-park", "viewpoint"],
  family: ["family-fun"],
  nightlife: ["nightlife", "viewpoint"],
};

const getNumericValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPreferredAttractionCategorySlugs = (preferences) => {
  const categorySlugs = new Set();

  preferences.forEach((preference) => {
    const preferenceSlug = readRecordValue(preference, ["slug"], "");
    const mappedSlugs = PREFERENCE_TO_ATTRACTION_CATEGORY_SLUGS[preferenceSlug] || [];

    mappedSlugs.forEach((slug) => {
      categorySlugs.add(slug);
    });
  });

  return categorySlugs;
};

const scoreAttractionCandidate = ({ attraction, categories, preferredCategorySlugs }) => {
  const categorySlugs = categories.map((category) => readRecordValue(category, ["slug"], ""));
  const preferenceMatchCount = categorySlugs.filter((slug) =>
    preferredCategorySlugs.has(slug)
  ).length;
  const rating = getNumericValue(readRecordValue(attraction, ["rating"]), 0);
  const durationMinutes = Math.max(
    45,
    getNumericValue(readRecordValue(attraction, ["estimatedDurationMinutes"]), 120)
  );
  const durationFitScore = Math.max(0, 180 - Math.abs(durationMinutes - 150)) / 10;

  return {
    attractionId: readRecordValue(attraction, ["id"]),
    attraction,
    categories,
    categorySlugs,
    durationMinutes,
    preferenceMatchCount,
    rating,
    score:
      preferenceMatchCount * 100 +
      rating * 10 +
      durationFitScore +
      categorySlugs.length,
  };
};

const sortCandidatesDeterministically = (candidates) =>
  [...candidates].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.preferenceMatchCount !== left.preferenceMatchCount) {
      return right.preferenceMatchCount - left.preferenceMatchCount;
    }

    if (right.rating !== left.rating) {
      return right.rating - left.rating;
    }

    if (left.durationMinutes !== right.durationMinutes) {
      return left.durationMinutes - right.durationMinutes;
    }

    return String(readRecordValue(left.attraction, ["name"], "")).localeCompare(
      String(readRecordValue(right.attraction, ["name"], ""))
    );
  });

const buildPlanningStrategy = ({
  providerName,
  providerExplanation,
  usedProviderRanking,
}) => ({
  mode: usedProviderRanking
    ? "deterministic_plus_provider"
    : "deterministic_only",
  provider: providerName,
  usedProviderRanking,
  reasoning:
    usedProviderRanking && providerExplanation
      ? providerExplanation
      : "MVP generation uses deterministic scheduling over curated DB attractions. Providers may rerank known candidates later but cannot introduce new attractions.",
});

const buildPreviewPayload = ({
  budget,
  budgetFit,
  budgetWarnings,
  coverage,
  isPartial,
  trip,
  preferences,
  days,
  strategy,
  warnings,
}) => ({
  tripId: readRecordValue(trip, ["id"]),
  destinationId: readRecordValue(trip, ["destinationId"]),
  planningMode: readRecordValue(trip, ["planningMode"], ""),
  startDate: readRecordValue(trip, ["startDate"], ""),
  endDate: readRecordValue(trip, ["endDate"], ""),
  generatedAt: new Date().toISOString(),
  preferences: preferences.map(serializePreferenceCategory),
  strategy,
  budget,
  budgetFit,
  budgetWarnings,
  isPartial,
  coverage,
  warnings,
  days,
});

module.exports = {
  buildPlanningStrategy,
  buildPreviewPayload,
  getPreferredAttractionCategorySlugs,
  scoreAttractionCandidate,
  sortCandidatesDeterministically,
};
