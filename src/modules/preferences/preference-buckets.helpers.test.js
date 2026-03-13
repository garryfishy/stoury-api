const {
  PRODUCT_PREFERENCE_BUCKETS,
  getAttractionCategorySlugsForPreference,
  getPreferenceBucketForCategorySlugs,
  isDestinationWidePreferenceSlug,
  normalizeAttractionCategorySlugToPreferenceBucket,
} = require("./preference-buckets.helpers");

describe("preference bucket helpers", () => {
  test("normalizes product-facing attraction categories into the four supported buckets", () => {
    expect(normalizeAttractionCategorySlugToPreferenceBucket("culinary")).toBe(
      PRODUCT_PREFERENCE_BUCKETS.FOOD
    );
    expect(normalizeAttractionCategorySlugToPreferenceBucket("shopping")).toBe(
      PRODUCT_PREFERENCE_BUCKETS.SHOPPING
    );
    expect(normalizeAttractionCategorySlugToPreferenceBucket("heritage")).toBe(
      PRODUCT_PREFERENCE_BUCKETS.HISTORY
    );
    expect(normalizeAttractionCategorySlugToPreferenceBucket("temple")).toBe(
      PRODUCT_PREFERENCE_BUCKETS.HISTORY
    );
    expect(normalizeAttractionCategorySlugToPreferenceBucket("viewpoint")).toBe(
      PRODUCT_PREFERENCE_BUCKETS.POPULAR
    );
  });

  test("keeps bucket priority deterministic when multiple categories are present", () => {
    expect(getPreferenceBucketForCategorySlugs(["viewpoint", "culinary"])).toBe(
      PRODUCT_PREFERENCE_BUCKETS.FOOD
    );
    expect(getPreferenceBucketForCategorySlugs(["temple", "shopping"])).toBe(
      PRODUCT_PREFERENCE_BUCKETS.SHOPPING
    );
    expect(getPreferenceBucketForCategorySlugs(["beach", "heritage"])).toBe(
      PRODUCT_PREFERENCE_BUCKETS.HISTORY
    );
    expect(getPreferenceBucketForCategorySlugs(["viewpoint"])).toBe(
      PRODUCT_PREFERENCE_BUCKETS.POPULAR
    );
  });

  test("maps AI preference slugs to the same product buckets while preserving legacy planner inputs", () => {
    expect(getAttractionCategorySlugsForPreference("history")).toEqual([
      "heritage",
      "temple",
    ]);
    expect(getAttractionCategorySlugsForPreference("food")).toEqual(["culinary"]);
    expect(getAttractionCategorySlugsForPreference("shopping")).toEqual(["shopping"]);
    expect(getAttractionCategorySlugsForPreference("popular")).toEqual([]);
    expect(getAttractionCategorySlugsForPreference("nature")).toEqual([
      "beach",
      "nature-park",
      "viewpoint",
    ]);
    expect(isDestinationWidePreferenceSlug("popular")).toBe(true);
    expect(isDestinationWidePreferenceSlug("history")).toBe(false);
  });
});
