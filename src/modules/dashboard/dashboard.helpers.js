const {
  DASHBOARD_FEATURED_LIMIT,
  DASHBOARD_FEATURED_POOL_LIMIT,
} = require("../../config/dashboard");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  ATTRACTION_PHOTO_VARIANTS,
  deriveShortLocation,
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

const serializeDashboardDestinationSummary = (destination) => ({
  id: readRecordValue(destination, ["id"]),
  slug: readRecordValue(destination, ["slug"], ""),
  name: readRecordValue(destination, ["name"], ""),
});

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
    destination: serializeDashboardDestinationSummary(destination),
  };
};

const sortDashboardAttractions = (items = []) =>
  [...items].sort((left, right) => {
    if (right.popularityScore !== left.popularityScore) {
      return right.popularityScore - left.popularityScore;
    }

    return String(left.name).localeCompare(String(right.name));
  });

const selectRandomDashboardCards = (
  sortedItems = [],
  {
    featuredLimit = DASHBOARD_FEATURED_LIMIT,
    poolLimit = DASHBOARD_FEATURED_POOL_LIMIT,
    randomFn = Math.random,
  } = {}
) => {
  const pool = sortedItems.slice(0, poolLimit);
  const shuffled = [...pool];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled.slice(0, featuredLimit);
};

const buildDashboardHomePayload = ({ items = [], randomFn = Math.random } = {}) => {
  const sortedItems = sortDashboardAttractions(items);
  const featured = selectRandomDashboardCards(sortedItems, { randomFn });

  return {
    featured: featured.map((item) => item.card),
    meta: {
      featuredCount: featured.length,
      candidatePoolSize: Math.min(sortedItems.length, DASHBOARD_FEATURED_POOL_LIMIT),
      totalActiveAttractionCount: sortedItems.length,
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
  serializeDashboardDestinationSummary,
  selectRandomDashboardCards,
  sortDashboardAttractions,
};
