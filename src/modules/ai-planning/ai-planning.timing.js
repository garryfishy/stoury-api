const { readRecordValue } = require("../../utils/model-helpers");
const {
  minutesToTimeString,
  timeStringToMinutes,
} = require("../itineraries/itineraries.helpers");

const VALID_BEST_VISIT_TIMES = new Set([
  "sunrise",
  "early_morning",
  "morning",
  "late_morning",
  "midday",
  "afternoon",
  "late_afternoon",
  "sunset",
  "evening",
  "night",
  "full_day",
]);
const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const TIME_PROFILES = {
  sunrise: {
    preferredStartMinutes: 6 * 60,
    preferredEndMinutes: 8 * 60,
    targetStartMinutes: 6 * 60 + 30,
    earliestDayStartMinutes: 5 * 60 + 30,
    latestDayEndMinutes: 18 * 60,
  },
  early_morning: {
    preferredStartMinutes: 7 * 60,
    preferredEndMinutes: 9 * 60 + 30,
    targetStartMinutes: 8 * 60,
    earliestDayStartMinutes: 6 * 60 + 30,
    latestDayEndMinutes: 18 * 60,
  },
  morning: {
    preferredStartMinutes: 8 * 60,
    preferredEndMinutes: 11 * 60,
    targetStartMinutes: 9 * 60,
    earliestDayStartMinutes: 7 * 60 + 30,
    latestDayEndMinutes: 18 * 60,
  },
  late_morning: {
    preferredStartMinutes: 9 * 60 + 30,
    preferredEndMinutes: 12 * 60 + 30,
    targetStartMinutes: 10 * 60 + 30,
    earliestDayStartMinutes: 8 * 60,
    latestDayEndMinutes: 18 * 60,
  },
  midday: {
    preferredStartMinutes: 11 * 60,
    preferredEndMinutes: 14 * 60,
    targetStartMinutes: 12 * 60,
    earliestDayStartMinutes: 8 * 60,
    latestDayEndMinutes: 18 * 60,
  },
  afternoon: {
    preferredStartMinutes: 13 * 60,
    preferredEndMinutes: 16 * 60 + 30,
    targetStartMinutes: 14 * 60,
    earliestDayStartMinutes: 8 * 60,
    latestDayEndMinutes: 19 * 60,
  },
  late_afternoon: {
    preferredStartMinutes: 15 * 60,
    preferredEndMinutes: 17 * 60 + 30,
    targetStartMinutes: 16 * 60,
    earliestDayStartMinutes: 8 * 60,
    latestDayEndMinutes: 19 * 60,
  },
  sunset: {
    preferredStartMinutes: 16 * 60 + 30,
    preferredEndMinutes: 18 * 60 + 30,
    targetStartMinutes: 17 * 60 + 15,
    earliestDayStartMinutes: 8 * 60,
    latestDayEndMinutes: 20 * 60,
  },
  evening: {
    preferredStartMinutes: 18 * 60,
    preferredEndMinutes: 21 * 60,
    targetStartMinutes: 18 * 60 + 30,
    earliestDayStartMinutes: 9 * 60,
    latestDayEndMinutes: 22 * 60,
  },
  night: {
    preferredStartMinutes: 19 * 60,
    preferredEndMinutes: 21 * 60 + 30,
    targetStartMinutes: 19 * 60 + 30,
    earliestDayStartMinutes: 10 * 60,
    latestDayEndMinutes: 22 * 60,
  },
  full_day: {
    preferredStartMinutes: null,
    preferredEndMinutes: null,
    targetStartMinutes: null,
    earliestDayStartMinutes: 8 * 60,
    latestDayEndMinutes: 18 * 60,
  },
};

const normalizeBestVisitTime = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  return VALID_BEST_VISIT_TIMES.has(normalized) ? normalized : null;
};

const getCategorySlugSet = (candidate) =>
  new Set(
    [
      ...(Array.isArray(candidate?.categorySlugs) ? candidate.categorySlugs : []),
      ...(Array.isArray(candidate?.categories)
        ? candidate.categories.map((category) => readRecordValue(category, ["slug"], ""))
        : []),
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

const getNameSignal = (candidate) =>
  `${readRecordValue(candidate?.attraction || candidate, ["name"], "")} ${readRecordValue(
    candidate?.attraction || candidate,
    ["slug"],
    ""
  )}`
    .trim()
    .toLowerCase();

const getFallbackBestVisitTime = (candidate) => {
  const categorySlugs = getCategorySlugSet(candidate);
  const nameSignal = getNameSignal(candidate);

  if (nameSignal.includes("sunrise")) {
    return "sunrise";
  }

  if (categorySlugs.has("nightlife") || nameSignal.includes("bukit bintang")) {
    return "night";
  }

  if (
    nameSignal.includes("sky view") ||
    nameSignal.includes("hills") ||
    nameSignal.includes("sunset")
  ) {
    return categorySlugs.has("culinary") ? "evening" : "sunset";
  }

  if (categorySlugs.has("culinary") && categorySlugs.has("viewpoint")) {
    return "evening";
  }

  if (categorySlugs.has("culinary") && categorySlugs.has("nightlife")) {
    return "evening";
  }

  if (categorySlugs.has("temple") && categorySlugs.has("viewpoint")) {
    return "late_afternoon";
  }

  if (categorySlugs.has("temple") || categorySlugs.has("heritage")) {
    return "morning";
  }

  if (categorySlugs.has("shopping")) {
    return "late_morning";
  }

  if (categorySlugs.has("beach") || categorySlugs.has("viewpoint")) {
    return "late_afternoon";
  }

  return "full_day";
};

const getCandidateBestVisitTime = (candidate) => {
  const providerBestVisitTime = normalizeBestVisitTime(candidate?.providerBestVisitTime);

  if (providerBestVisitTime) {
    return providerBestVisitTime;
  }

  const metadata =
    readRecordValue(candidate?.attraction || candidate, ["metadata"], {}) || {};
  const metadataBestVisitTime = normalizeBestVisitTime(
    metadata.best_time || metadata.bestTime
  );

  if (metadataBestVisitTime) {
    return metadataBestVisitTime;
  }

  return getFallbackBestVisitTime(candidate);
};

const getCandidateOpeningHoursHint = (candidate) => {
  const openingHours =
    readRecordValue(candidate?.attraction || candidate, ["openingHours"], {}) || {};

  if (!openingHours || typeof openingHours !== "object") {
    return null;
  }

  let earliestOpenMinutes = null;
  let latestCloseMinutes = null;
  let hasAnyWindow = false;

  WEEKDAY_KEYS.forEach((weekdayKey) => {
    if (!Array.isArray(openingHours[weekdayKey])) {
      return;
    }

    openingHours[weekdayKey].forEach((window) => {
      const openMinutes = timeStringToMinutes(window?.open);
      const closeMinutes = timeStringToMinutes(window?.close);

      if (openMinutes === null || closeMinutes === null) {
        return;
      }

      hasAnyWindow = true;
      earliestOpenMinutes =
        earliestOpenMinutes === null
          ? openMinutes
          : Math.min(earliestOpenMinutes, openMinutes);
      latestCloseMinutes =
        latestCloseMinutes === null
          ? closeMinutes
          : Math.max(latestCloseMinutes, closeMinutes);
    });
  });

  if (!hasAnyWindow) {
    return null;
  }

  return {
    opensAt: minutesToTimeString(earliestOpenMinutes),
    closesAt: minutesToTimeString(latestCloseMinutes),
  };
};

const getCandidateVisitTimeProfile = (candidate) => {
  const bestVisitTime = getCandidateBestVisitTime(candidate);
  const categorySlugs = getCategorySlugSet(candidate);
  const profile = { ...(TIME_PROFILES[bestVisitTime] || TIME_PROFILES.full_day) };

  if (bestVisitTime === "sunset") {
    if (categorySlugs.has("culinary") || categorySlugs.has("nightlife")) {
      profile.preferredStartMinutes = 17 * 60;
      profile.preferredEndMinutes = 20 * 60;
      profile.targetStartMinutes = 18 * 60;
      profile.latestDayEndMinutes = 22 * 60;
    } else if (categorySlugs.has("temple") || categorySlugs.has("heritage")) {
      profile.preferredStartMinutes = 15 * 60 + 30;
      profile.preferredEndMinutes = 17 * 60 + 45;
      profile.targetStartMinutes = 16 * 60 + 15;
      profile.latestDayEndMinutes = 18 * 60 + 30;
    }
  }

  if (bestVisitTime === "late_afternoon" && categorySlugs.has("temple")) {
    profile.preferredStartMinutes = 14 * 60 + 30;
    profile.preferredEndMinutes = 17 * 60;
    profile.targetStartMinutes = 15 * 60 + 30;
  }

  if (bestVisitTime === "evening" && categorySlugs.has("culinary")) {
    profile.preferredStartMinutes = 17 * 60 + 30;
    profile.preferredEndMinutes = 21 * 60;
    profile.targetStartMinutes = 18 * 60 + 30;
    profile.latestDayEndMinutes = 22 * 60;
  }

  return {
    bestVisitTime,
    ...profile,
  };
};

const getVisitTimePenalty = ({ candidate, startMinutes }) => {
  const profile = getCandidateVisitTimeProfile(candidate);

  if (!Number.isFinite(startMinutes) || profile.bestVisitTime === "full_day") {
    return 0;
  }

  if (
    profile.preferredStartMinutes !== null &&
    profile.preferredEndMinutes !== null &&
    startMinutes >= profile.preferredStartMinutes &&
    startMinutes <= profile.preferredEndMinutes
  ) {
    if (!Number.isFinite(profile.targetStartMinutes)) {
      return 0;
    }

    return Math.abs(startMinutes - profile.targetStartMinutes) / 20;
  }

  const boundary =
    profile.preferredStartMinutes !== null &&
    startMinutes < profile.preferredStartMinutes
      ? profile.preferredStartMinutes
      : profile.preferredEndMinutes;
  const distanceFromPreferred = Math.abs(startMinutes - boundary);

  return 35 + distanceFromPreferred / 8;
};

module.exports = {
  getCandidateBestVisitTime,
  getCandidateOpeningHoursHint,
  getCandidateVisitTimeProfile,
  getVisitTimePenalty,
  normalizeBestVisitTime,
};
