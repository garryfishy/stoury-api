const PRODUCT_PREFERENCE_BUCKETS = {
  FOOD: "food",
  HISTORY: "history",
  POPULAR: "popular",
  SHOPPING: "shopping",
};

const PRODUCT_PREFERENCE_BUCKET_PRIORITY = [
  PRODUCT_PREFERENCE_BUCKETS.FOOD,
  PRODUCT_PREFERENCE_BUCKETS.SHOPPING,
  PRODUCT_PREFERENCE_BUCKETS.HISTORY,
  PRODUCT_PREFERENCE_BUCKETS.POPULAR,
];

const PRODUCT_PREFERENCE_TO_ATTRACTION_CATEGORY_SLUGS = {
  [PRODUCT_PREFERENCE_BUCKETS.POPULAR]: [],
  [PRODUCT_PREFERENCE_BUCKETS.HISTORY]: ["heritage", "temple"],
  [PRODUCT_PREFERENCE_BUCKETS.FOOD]: ["culinary"],
  [PRODUCT_PREFERENCE_BUCKETS.SHOPPING]: ["shopping"],
};

const LEGACY_PREFERENCE_TO_ATTRACTION_CATEGORY_SLUGS = {
  nature: ["beach", "nature-park", "viewpoint"],
  culture: ["heritage", "temple"],
  relaxation: ["beach", "nature-park", "viewpoint"],
  adventure: ["adventure", "nature-park", "viewpoint"],
  family: ["family-fun"],
  nightlife: ["nightlife", "viewpoint"],
};

const normalizeAttractionCategorySlugToPreferenceBucket = (slug) => {
  if (slug === "culinary") {
    return PRODUCT_PREFERENCE_BUCKETS.FOOD;
  }

  if (slug === "shopping") {
    return PRODUCT_PREFERENCE_BUCKETS.SHOPPING;
  }

  if (slug === "heritage" || slug === "temple") {
    return PRODUCT_PREFERENCE_BUCKETS.HISTORY;
  }

  return PRODUCT_PREFERENCE_BUCKETS.POPULAR;
};

const getPreferenceBucketForCategorySlugs = (categorySlugs = []) => {
  const normalizedBuckets = new Set(
    categorySlugs
      .map((slug) => normalizeAttractionCategorySlugToPreferenceBucket(slug))
      .filter(Boolean)
  );

  return (
    PRODUCT_PREFERENCE_BUCKET_PRIORITY.find((bucket) =>
      normalizedBuckets.has(bucket)
    ) || PRODUCT_PREFERENCE_BUCKETS.POPULAR
  );
};

const getAttractionCategorySlugsForPreference = (preferenceSlug) =>
  PRODUCT_PREFERENCE_TO_ATTRACTION_CATEGORY_SLUGS[preferenceSlug] ||
  LEGACY_PREFERENCE_TO_ATTRACTION_CATEGORY_SLUGS[preferenceSlug] ||
  [];

const isDestinationWidePreferenceSlug = (preferenceSlug) =>
  preferenceSlug === PRODUCT_PREFERENCE_BUCKETS.POPULAR;

module.exports = {
  PRODUCT_PREFERENCE_BUCKETS,
  getAttractionCategorySlugsForPreference,
  getPreferenceBucketForCategorySlugs,
  isDestinationWidePreferenceSlug,
  normalizeAttractionCategorySlugToPreferenceBucket,
};
