const { readRecordValue } = require("../../utils/model-helpers");

const DEFAULT_BUDGET_STEP = 5000;

const CATEGORY_BUDGET_PROFILES = {
  adventure: {
    min: 50000,
    max: 200000,
    note: "Heuristic only: allows for common activity or equipment fees at this stop.",
  },
  beach: {
    min: 0,
    max: 25000,
    note: "Heuristic only: allows for parking, local entry, or small beach-side spend.",
  },
  culinary: {
    min: 25000,
    max: 150000,
    note: "Heuristic only: allows for a modest food or drink spend at this stop.",
  },
  "family-fun": {
    min: 25000,
    max: 125000,
    note: "Heuristic only: allows for basic family-oriented entry or activity fees.",
  },
  heritage: {
    min: 0,
    max: 50000,
    note: "Heuristic only: allows for common entry, donation, or parking-style spend.",
  },
  nightlife: {
    min: 50000,
    max: 200000,
    note: "Heuristic only: allows for light venue cover or drinks only.",
  },
  "nature-park": {
    min: 10000,
    max: 50000,
    note: "Heuristic only: allows for common entry, parking, or local conservation fees.",
  },
  shopping: {
    min: 0,
    max: 100000,
    note: "Heuristic only: allows for light discretionary shopping only.",
  },
  temple: {
    min: 0,
    max: 50000,
    note: "Heuristic only: allows for common entry, donation, or parking-style spend.",
  },
  viewpoint: {
    min: 0,
    max: 25000,
    note: "Heuristic only: allows for parking or a small local fee at this stop.",
  },
};

const getNumericValue = (value, fallback = null) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundBudgetValue = (value) =>
  Math.max(0, Math.round(value / DEFAULT_BUDGET_STEP) * DEFAULT_BUDGET_STEP);

const getDurationMultiplier = (durationMinutes) => {
  if (!Number.isFinite(durationMinutes)) {
    return 1;
  }

  if (durationMinutes >= 180) {
    return 1.4;
  }

  if (durationMinutes >= 120) {
    return 1.2;
  }

  if (durationMinutes >= 90) {
    return 1;
  }

  return 0.85;
};

const resolveBudgetProfile = (categorySlugs) => {
  const profiles = categorySlugs
    .map((slug) => CATEGORY_BUDGET_PROFILES[slug])
    .filter(Boolean);

  if (!profiles.length) {
    return null;
  }

  return profiles.reduce((selected, candidate) => {
    if (!selected || candidate.max > selected.max) {
      return candidate;
    }

    return selected;
  }, null);
};

const estimateItineraryItemBudget = ({
  attraction,
  categories = [],
  durationMinutes,
}) => {
  const categorySlugs = categories
    .map((category) => readRecordValue(category, ["slug"], ""))
    .filter(Boolean);
  const profile = resolveBudgetProfile(categorySlugs);

  if (!profile) {
    return {
      estimatedBudgetMin: null,
      estimatedBudgetMax: null,
      estimatedBudgetNote: null,
    };
  }

  const resolvedDurationMinutes =
    durationMinutes ??
    getNumericValue(readRecordValue(attraction, ["estimatedDurationMinutes"]), null);
  const multiplier = getDurationMultiplier(resolvedDurationMinutes);
  const estimatedBudgetMin = roundBudgetValue(profile.min * multiplier);
  const estimatedBudgetMax = roundBudgetValue(
    Math.max(profile.max * multiplier, estimatedBudgetMin)
  );

  return {
    estimatedBudgetMin,
    estimatedBudgetMax,
    estimatedBudgetNote: profile.note,
  };
};

module.exports = {
  estimateItineraryItemBudget,
};
