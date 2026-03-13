const {
  DASHBOARD_EXPLORE_MORE_LIMIT,
  DASHBOARD_FEATURED_LIMIT,
} = require("../../config/dashboard");
const { readRecordValue } = require("../../utils/model-helpers");
const { serializeDestination } = require("../destinations/destinations.helpers");
const {
  ATTRACTION_PHOTO_VARIANTS,
  getProductPreferenceBucketKey,
  resolveAttractionImageUrl,
} = require("../attractions/attractions.helpers");
const { getPreferenceDisplayName } = require("../preferences/preferences.helpers");

const DASHBOARD_BADGES = {
  FOOD: "food",
  HISTORY: "history",
  POPULAR: "popular",
  SHOPPING: "shopping",
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const getAttractionCategorySlugs = (categories = []) =>
  categories
    .map((category) => readRecordValue(category, ["slug"], ""))
    .filter(Boolean);

const getDashboardBadgeKey = (categories = []) => {
  const bucket = getProductPreferenceBucketKey(categories);

  if (Object.values(DASHBOARD_BADGES).includes(bucket)) {
    return bucket;
  }

  return DASHBOARD_BADGES.POPULAR;
};

const getDashboardBadge = (categories = []) =>
  getPreferenceDisplayName(
    getDashboardBadgeKey(categories),
    DASHBOARD_BADGES.POPULAR
  );

const getDisplayRating = (record) => {
  const externalRating = toFiniteNumber(readRecordValue(record, ["externalRating"], null));

  if (externalRating !== null) {
    return externalRating;
  }

  return toFiniteNumber(readRecordValue(record, ["rating"], null));
};

const getPopularityScore = (record) => {
  const externalReviewCount = Math.max(
    0,
    toFiniteNumber(readRecordValue(record, ["externalReviewCount"], 0)) || 0
  );
  const rating = getDisplayRating(record) || 0;

  return Math.log10(externalReviewCount + 1) * 100 + rating * 20;
};

const deriveShortLocation = (record, destination) => {
  const fullAddress = String(readRecordValue(record, ["fullAddress"], "") || "").trim();
  const destinationName = String(readRecordValue(destination, ["name"], "") || "").trim();
  const cityName =
    String(readRecordValue(destination, ["cityName"], "") || "").trim() || destinationName;
  const addressParts = fullAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const destinationIndex = addressParts.findIndex(
    (part) => part.toLowerCase() === cityName.toLowerCase()
  );

  if (destinationIndex > 0) {
    return `${addressParts[destinationIndex - 1]}, ${cityName}`;
  }

  if (destinationName && destinationIndex === -1) {
    const destinationNameIndex = addressParts.findIndex(
      (part) => part.toLowerCase() === destinationName.toLowerCase()
    );

    if (destinationNameIndex > 0) {
      return `${addressParts[destinationNameIndex - 1]}, ${destinationName}`;
    }
  }

  if (addressParts.length >= 2) {
    return addressParts.slice(-2).join(", ");
  }

  return cityName || destinationName || fullAddress || null;
};

const serializeDashboardCard = (record, { destination, categories = [] } = {}) => {
  const badgeKey = getDashboardBadgeKey(categories);

  return {
    id: readRecordValue(record, ["id"]),
    slug: readRecordValue(record, ["slug"], ""),
    name: readRecordValue(record, ["name"], ""),
    shortLocation: deriveShortLocation(record, destination),
    thumbnailImageUrl: resolveAttractionImageUrl(
      record,
      ATTRACTION_PHOTO_VARIANTS.thumbnail
    ),
    rating: getDisplayRating(record),
    badge: getPreferenceDisplayName(badgeKey, badgeKey),
    badgeKey,
  };
};

const sortDashboardAttractions = (items = []) =>
  [...items].sort((left, right) => {
    if (right.popularityScore !== left.popularityScore) {
      return right.popularityScore - left.popularityScore;
    }

    return String(left.name).localeCompare(String(right.name));
  });

const buildDashboardHomePayload = ({
  destination,
  items = [],
  defaultDestinationSlug = null,
}) => {
  const sortedItems = sortDashboardAttractions(items);

  return {
    destination: serializeDestination(destination),
    featured: sortedItems.slice(0, DASHBOARD_FEATURED_LIMIT).map((item) => item.card),
    exploreMore: sortedItems
      .slice(DASHBOARD_FEATURED_LIMIT, DASHBOARD_FEATURED_LIMIT + DASHBOARD_EXPLORE_MORE_LIMIT)
      .map((item) => item.card),
    meta: {
      defaultDestinationSlug,
      featuredCount: Math.min(sortedItems.length, DASHBOARD_FEATURED_LIMIT),
      exploreMoreCount: Math.max(
        Math.min(
          sortedItems.length - DASHBOARD_FEATURED_LIMIT,
          DASHBOARD_EXPLORE_MORE_LIMIT
        ),
        0
      ),
    },
  };
};

module.exports = {
  DASHBOARD_BADGES,
  buildDashboardHomePayload,
  deriveShortLocation,
  getAttractionCategorySlugs,
  getDashboardBadge,
  getDashboardBadgeKey,
  getDisplayRating,
  getPopularityScore,
  serializeDashboardCard,
  sortDashboardAttractions,
};
