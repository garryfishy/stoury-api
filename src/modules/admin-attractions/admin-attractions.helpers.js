const { readRecordValue } = require("../../utils/model-helpers");
const { serializeDestination } = require("../destinations/destinations.helpers");

const GOOGLE_ENRICHMENT_SOURCE = "google_places";
const ENRICHMENT_STATUSES = ["pending", "enriched", "needs_review", "failed"];
const DEFAULT_PENDING_LIMIT = 25;
const MAX_PENDING_LIMIT = 100;
const DEFAULT_BATCH_LIMIT = 10;
const MAX_BATCH_LIMIT = 25;
const DEFAULT_STALE_DAYS = 30;
const GOOGLE_TEXT_SEARCH_RADIUS_METERS = 10000;

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getAttractionCoordinates = (record) => {
  const latitude = toFiniteNumber(readRecordValue(record, ["latitude"], null));
  const longitude = toFiniteNumber(readRecordValue(record, ["longitude"], null));

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
};

const hasEnrichmentStateAttributes = (Attraction) =>
  Boolean(
    Attraction?.rawAttributes?.enrichmentStatus &&
      Attraction?.rawAttributes?.enrichmentError &&
      Attraction?.rawAttributes?.enrichmentAttemptedAt
  );

const getEffectiveEnrichmentStatus = (record, { hasStateAttributes = false } = {}) => {
  if (hasStateAttributes) {
    const explicitStatus = readRecordValue(record, ["enrichmentStatus"], null);

    if (explicitStatus) {
      return explicitStatus;
    }
  }

  return readRecordValue(record, ["externalPlaceId"], null) ? "enriched" : "pending";
};

const buildEnrichmentState = (record, { hasStateAttributes = false } = {}) => ({
  status: getEffectiveEnrichmentStatus(record, { hasStateAttributes }),
  error: hasStateAttributes ? readRecordValue(record, ["enrichmentError"], null) : null,
  attemptedAt: hasStateAttributes
    ? readRecordValue(record, ["enrichmentAttemptedAt"], null)
    : null,
  externalSource: readRecordValue(record, ["externalSource"], null),
  externalPlaceId: readRecordValue(record, ["externalPlaceId"], null),
  externalRating: readRecordValue(record, ["externalRating"], null),
  externalReviewCount: readRecordValue(record, ["externalReviewCount"], null),
  externalLastSyncedAt: readRecordValue(record, ["externalLastSyncedAt"], null),
});

const serializeAdminAttraction = (
  record,
  destination,
  { hasStateAttributes = false } = {}
) => ({
  id: readRecordValue(record, ["id"]),
  name: readRecordValue(record, ["name"], ""),
  slug: readRecordValue(record, ["slug"], ""),
  coordinates: getAttractionCoordinates(record),
  destination: destination ? serializeDestination(destination) : null,
  enrichment: buildEnrichmentState(record, { hasStateAttributes }),
});

const buildGoogleSearchQuery = ({ attraction, destination }) =>
  [
    readRecordValue(attraction, ["name"], ""),
    readRecordValue(destination, ["name"], ""),
    readRecordValue(destination, ["countryName"], ""),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

const toRadians = (value) => (value * Math.PI) / 180;

const computeDistanceMeters = (origin, destination) => {
  if (
    !origin ||
    !destination ||
    toFiniteNumber(origin.latitude) === null ||
    toFiniteNumber(origin.longitude) === null ||
    toFiniteNumber(destination.latitude) === null ||
    toFiniteNumber(destination.longitude) === null
  ) {
    return null;
  }

  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return Math.round(
    2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const scorePlaceCandidate = ({ attraction, candidate }) => {
  const attractionName = normalizeText(readRecordValue(attraction, ["name"], ""));
  const candidateName = normalizeText(candidate.name);
  const attractionLocation = getAttractionCoordinates(attraction);
  const distanceMeters = computeDistanceMeters(attractionLocation, candidate.location);
  const exactNameMatch = attractionName && candidateName === attractionName;
  const partialNameMatch =
    attractionName &&
    candidateName &&
    (candidateName.includes(attractionName) || attractionName.includes(candidateName));

  let score = 0;

  if (exactNameMatch) {
    score += 70;
  } else if (partialNameMatch) {
    score += 35;
  }

  if (distanceMeters !== null) {
    if (distanceMeters <= 750) {
      score += 30;
    } else if (distanceMeters <= 2500) {
      score += 20;
    } else if (distanceMeters <= 10000) {
      score += 10;
    } else {
      score -= 20;
    }
  }

  if (toFiniteNumber(candidate.rating) !== null) {
    score += Math.min(10, Math.round(Number(candidate.rating)));
  }

  return {
    ...candidate,
    distanceMeters,
    exactNameMatch,
    partialNameMatch,
    score,
  };
};

const pickEnrichmentMatch = ({ attraction, candidates }) => {
  const rankedCandidates = (Array.isArray(candidates) ? candidates : [])
    .map((candidate) => scorePlaceCandidate({ attraction, candidate }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.distanceMeters !== null && right.distanceMeters !== null) {
        return left.distanceMeters - right.distanceMeters;
      }

      return String(left.name).localeCompare(String(right.name));
    });

  if (!rankedCandidates.length) {
    return {
      candidateCount: 0,
      candidates: [],
      outcome: "failed",
      reason: "No Google Places matches were found for the attraction.",
      selectedCandidate: null,
    };
  }

  const [topCandidate, secondCandidate] = rankedCandidates;
  const topCandidateHasStrongLocationSignal =
    topCandidate.distanceMeters !== null && topCandidate.distanceMeters <= 2500;
  const isConfidentMatch =
    topCandidate.score >= 70 &&
    (topCandidate.exactNameMatch || topCandidateHasStrongLocationSignal) &&
    (!secondCandidate || topCandidate.score - secondCandidate.score >= 15);

  return {
    candidateCount: rankedCandidates.length,
    candidates: rankedCandidates.slice(0, 3),
    outcome: isConfidentMatch ? "enriched" : "needs_review",
    reason: isConfidentMatch
      ? null
      : "Google Places returned multiple plausible matches. Manual review is required.",
    selectedCandidate: isConfidentMatch ? topCandidate : null,
  };
};

module.exports = {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_PENDING_LIMIT,
  DEFAULT_STALE_DAYS,
  ENRICHMENT_STATUSES,
  GOOGLE_ENRICHMENT_SOURCE,
  GOOGLE_TEXT_SEARCH_RADIUS_METERS,
  MAX_BATCH_LIMIT,
  MAX_PENDING_LIMIT,
  buildEnrichmentState,
  buildGoogleSearchQuery,
  getAttractionCoordinates,
  getEffectiveEnrichmentStatus,
  hasEnrichmentStateAttributes,
  normalizeText,
  pickEnrichmentMatch,
  serializeAdminAttraction,
};
