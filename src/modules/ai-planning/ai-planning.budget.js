const { readRecordValue } = require("../../utils/model-helpers");

const VERY_LOW_DAILY_BUDGET = 250000;
const TIGHT_DAILY_BUDGET = 500000;
const COMFORTABLE_DAILY_BUDGET = 1200000;

const formatBudgetValue = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);

const getBudgetNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const getPerDayBudget = (budgetValue, dayCount) => {
  const safeDayCount = Math.max(1, Number(dayCount) || 1);

  return Number((budgetValue / safeDayCount).toFixed(2));
};

const getBudgetFitLevel = (perDayBudget) => {
  if (perDayBudget < VERY_LOW_DAILY_BUDGET) {
    return "very_low";
  }

  if (perDayBudget < TIGHT_DAILY_BUDGET) {
    return "tight";
  }

  if (perDayBudget < COMFORTABLE_DAILY_BUDGET) {
    return "balanced";
  }

  return "comfortable";
};

const buildBudgetFitReasoning = ({ level, perDayBudget, dayCount }) => {
  const formattedPerDay = formatBudgetValue(perDayBudget);

  if (level === "very_low") {
    return `Budget averages about ${formattedPerDay} per day across ${dayCount} day(s), so this preview should be treated as a very rough, lighter-spend plan only.`;
  }

  if (level === "tight") {
    return `Budget averages about ${formattedPerDay} per day across ${dayCount} day(s), so this preview is a soft fit signal rather than a strong spend match.`;
  }

  if (level === "balanced") {
    return `Budget averages about ${formattedPerDay} per day across ${dayCount} day(s), which is a workable planning signal for the current curated itinerary style.`;
  }

  return `Budget averages about ${formattedPerDay} per day across ${dayCount} day(s), which gives the planner comfortable room for the current curated itinerary style.`;
};

const buildBudgetWarnings = ({
  level,
  isPartial,
  dayCount,
  perDayBudget,
}) => {
  const warnings = [
    "Budget fit is approximate because attraction-level pricing, transport, food, and lodging costs are not stored in the current catalog yet.",
  ];

  if (level === "very_low") {
    warnings.unshift(
      `Trip budget is very low relative to ${dayCount} day(s) of travel (about ${formatBudgetValue(perDayBudget)} per day).`
    );
  } else if (level === "tight") {
    warnings.unshift(
      `Trip budget may feel tight for ${dayCount} day(s) of travel (about ${formatBudgetValue(perDayBudget)} per day).`
    );
  }

  if (isPartial) {
    warnings.push(
      "Budget fit is based on a partial preview because the planner could not fill every recommended itinerary slot."
    );
  }

  return warnings;
};

const buildBudgetAnalysis = ({ trip, dayCount, isPartial }) => {
  const rawBudget = readRecordValue(trip, ["budget"], null);
  const budgetValue = getBudgetNumber(rawBudget);

  if (budgetValue === null) {
    return {
      budget: null,
      budgetFit: {
        level: "not_provided",
        perDayBudget: null,
        isApproximate: true,
        reasoning:
          "No trip budget is stored, so the preview cannot estimate rough budget fit.",
      },
      budgetWarnings: [
        "No trip budget is stored, so the preview cannot estimate rough budget fit.",
      ],
    };
  }

  const safeDayCount = Math.max(1, Number(dayCount) || 1);
  const perDayBudget = getPerDayBudget(budgetValue, safeDayCount);
  const level = getBudgetFitLevel(perDayBudget);

  return {
    budget: rawBudget,
    budgetFit: {
      level,
      perDayBudget,
      isApproximate: true,
      reasoning: buildBudgetFitReasoning({
        level,
        perDayBudget,
        dayCount: safeDayCount,
      }),
    },
    budgetWarnings: buildBudgetWarnings({
      level,
      isPartial,
      dayCount: safeDayCount,
      perDayBudget,
    }),
  };
};

module.exports = {
  buildBudgetAnalysis,
  getBudgetNumber,
  getPerDayBudget,
};
