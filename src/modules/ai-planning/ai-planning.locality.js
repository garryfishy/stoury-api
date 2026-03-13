const { readRecordValue } = require("../../utils/model-helpers");
const {
  DEFAULT_DAY_END_MINUTES,
  DEFAULT_DAY_START_MINUTES,
  DEFAULT_ITEM_BUFFER_MINUTES,
  findSchedulableWindow,
} = require("../itineraries/itineraries.helpers");
const {
  getCandidateVisitTimeProfile,
  getVisitTimePenalty,
} = require("./ai-planning.timing");

const EARTH_RADIUS_KM = 6371;
const LOCALITY_LOOKAHEAD_LIMIT = 12;
const LOCALITY_RANK_WEIGHT = 4;
const LOCALITY_DISTANCE_WEIGHT = 1.5;
const LOCALITY_ANCHOR_DISTANCE_WEIGHT = 0.35;
const ROAD_DISTANCE_MULTIPLIER = 1.35;
const AVERAGE_CITY_TRAVEL_SPEED_KMH = 30;
const MAX_DISTANCE_SCORE_KM = 60;
const MAX_ADDITIONAL_TRANSFER_MINUTES = 90;

const toFiniteCoordinate = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const toRadians = (value) => (value * Math.PI) / 180;

const getCandidateCoordinates = (candidate) => {
  const attraction = candidate?.attraction || candidate || {};

  return {
    latitude: toFiniteCoordinate(readRecordValue(attraction, ["latitude"], null)),
    longitude: toFiniteCoordinate(readRecordValue(attraction, ["longitude"], null)),
  };
};

const calculateCandidateDistanceKm = (fromCandidate, toCandidate) => {
  const from = getCandidateCoordinates(fromCandidate);
  const to = getCandidateCoordinates(toCandidate);

  if (
    from.latitude === null ||
    from.longitude === null ||
    to.latitude === null ||
    to.longitude === null
  ) {
    return null;
  }

  const latitudeDistance = toRadians(to.latitude - from.latitude);
  const longitudeDistance = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDistance / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const estimateAdditionalTransferMinutes = ({
  fromCandidate,
  toCandidate,
  baseBufferMinutes = DEFAULT_ITEM_BUFFER_MINUTES,
} = {}) => {
  const distanceKm = calculateCandidateDistanceKm(fromCandidate, toCandidate);

  if (distanceKm === null) {
    return 0;
  }

  const estimatedTravelMinutes = Math.ceil(
    ((distanceKm * ROAD_DISTANCE_MULTIPLIER) / AVERAGE_CITY_TRAVEL_SPEED_KMH) * 60
  );

  return Math.min(
    MAX_ADDITIONAL_TRANSFER_MINUTES,
    Math.max(0, estimatedTravelMinutes - baseBufferMinutes)
  );
};

const getLocalityScore = ({
  rankIndex,
  previousCandidate,
  dayAnchorCandidate,
  candidate,
  selectedStartMinutes,
  isFirstItemOfDay,
}) => {
  let score = rankIndex * LOCALITY_RANK_WEIGHT;
  const previousDistanceKm = calculateCandidateDistanceKm(previousCandidate, candidate);
  const anchorDistanceKm =
    dayAnchorCandidate &&
    readRecordValue(dayAnchorCandidate, ["attractionId"], null) !==
      readRecordValue(previousCandidate, ["attractionId"], null)
      ? calculateCandidateDistanceKm(dayAnchorCandidate, candidate)
      : null;

  if (previousDistanceKm !== null) {
    score += Math.min(previousDistanceKm, MAX_DISTANCE_SCORE_KM) * LOCALITY_DISTANCE_WEIGHT;
  }

  if (anchorDistanceKm !== null) {
    score +=
      Math.min(anchorDistanceKm, MAX_DISTANCE_SCORE_KM) *
      LOCALITY_ANCHOR_DISTANCE_WEIGHT;
  }

  score += getVisitTimePenalty({
    candidate,
    startMinutes: selectedStartMinutes,
  });

  if (isFirstItemOfDay) {
    score += Math.max(0, selectedStartMinutes - DEFAULT_DAY_START_MINUTES) / 10;
  }

  return score;
};

const getCandidateWindowOptions = ({
  candidate,
  dateOnly,
  desiredStartMinutes,
  previousCandidate = null,
  isFirstItemOfDay = false,
  dailyStartMinutes = DEFAULT_DAY_START_MINUTES,
  dailyEndMinutes = DEFAULT_DAY_END_MINUTES,
}) => {
  const additionalTransferMinutes = previousCandidate
    ? estimateAdditionalTransferMinutes({
        fromCandidate: previousCandidate,
        toCandidate: candidate,
      })
    : 0;
  const timeProfile = getCandidateVisitTimeProfile(candidate);
  const adjustedDesiredStartMinutes =
    isFirstItemOfDay &&
    Number.isFinite(timeProfile.preferredStartMinutes)
      ? timeProfile.preferredStartMinutes
      : desiredStartMinutes + additionalTransferMinutes;
  const effectiveDailyStartMinutes = Math.min(
    dailyStartMinutes,
    Number.isFinite(timeProfile.earliestDayStartMinutes)
      ? timeProfile.earliestDayStartMinutes
      : dailyStartMinutes
  );
  const effectiveDailyEndMinutes = Math.max(
    dailyEndMinutes,
    Number.isFinite(timeProfile.latestDayEndMinutes)
      ? timeProfile.latestDayEndMinutes
      : dailyEndMinutes
  );
  const preferredDesiredStartMinutes = Number.isFinite(
    timeProfile.preferredStartMinutes
  )
    ? Math.max(adjustedDesiredStartMinutes, timeProfile.preferredStartMinutes)
    : adjustedDesiredStartMinutes;
  const preferredWindow = findSchedulableWindow({
    openingHours: readRecordValue(candidate.attraction, ["openingHours"], {}),
    dateOnly,
    desiredStartMinutes: preferredDesiredStartMinutes,
    durationMinutes: candidate.durationMinutes,
    dailyStartMinutes: effectiveDailyStartMinutes,
    dailyEndMinutes: effectiveDailyEndMinutes,
  });
  const isPreferredWindowValid =
    preferredWindow &&
    (!Number.isFinite(timeProfile.preferredEndMinutes) ||
      preferredWindow.startMinutes <= timeProfile.preferredEndMinutes);

  if (isPreferredWindowValid) {
    return {
      window: preferredWindow,
      additionalTransferMinutes,
    };
  }

  const fallbackWindow = findSchedulableWindow({
    openingHours: readRecordValue(candidate.attraction, ["openingHours"], {}),
    dateOnly,
    desiredStartMinutes: desiredStartMinutes + additionalTransferMinutes,
    durationMinutes: candidate.durationMinutes,
    dailyStartMinutes: effectiveDailyStartMinutes,
    dailyEndMinutes: effectiveDailyEndMinutes,
  });

  return fallbackWindow
    ? {
        window: fallbackWindow,
        additionalTransferMinutes,
      }
    : null;
};

const findBestCandidateForDay = ({
  remainingCandidates,
  dateOnly,
  desiredStartMinutes,
  previousCandidate = null,
  dayAnchorCandidate = null,
  dailyStartMinutes = DEFAULT_DAY_START_MINUTES,
  dailyEndMinutes = DEFAULT_DAY_END_MINUTES,
} = {}) => {
  const searchLimit = Math.min(
    remainingCandidates.length,
    LOCALITY_LOOKAHEAD_LIMIT
  );
  let bestSelection = null;
  const isFirstItemOfDay = !previousCandidate;

  for (let index = 0; index < searchLimit; index += 1) {
    const candidate = remainingCandidates[index];
    const candidateWindowOptions = getCandidateWindowOptions({
      candidate,
      dateOnly,
      desiredStartMinutes,
      previousCandidate,
      isFirstItemOfDay,
      dailyStartMinutes,
      dailyEndMinutes,
    });

    if (!candidateWindowOptions) {
      continue;
    }
    const { window } = candidateWindowOptions;

    const score = getLocalityScore({
      rankIndex: index,
      previousCandidate,
      dayAnchorCandidate,
      candidate,
      selectedStartMinutes: window.startMinutes,
      isFirstItemOfDay,
    });

    if (!bestSelection || score < bestSelection.score) {
      bestSelection = {
        score,
        selectedIndex: index,
        selectedWindow: window,
      };
    }
  }

  if (bestSelection) {
    return bestSelection;
  }

  for (let index = searchLimit; index < remainingCandidates.length; index += 1) {
    const candidateWindowOptions = getCandidateWindowOptions({
      candidate: remainingCandidates[index],
      dateOnly,
      desiredStartMinutes,
      previousCandidate,
      isFirstItemOfDay,
      dailyStartMinutes,
      dailyEndMinutes,
    });

    if (candidateWindowOptions) {
      return {
        selectedIndex: index,
        selectedWindow: candidateWindowOptions.window,
      };
    }
  }

  return null;
};

module.exports = {
  calculateCandidateDistanceKm,
  estimateAdditionalTransferMinutes,
  findBestCandidateForDay,
};
