const { Op } = require("sequelize");
const env = require("../../config/env");
const { readRecordValue } = require("../../utils/model-helpers");
const { normalizeOpeningHours } = require("../../utils/opening-hours");
const { serializeDestination } = require("../destinations/destinations.helpers");
const {
  getPreferenceBucketForCategorySlugs,
} = require("../preferences/preference-buckets.helpers");
const { getPreferenceDisplayName } = require("../preferences/preferences.helpers");

const ATTRACTION_PHOTO_VARIANTS = Object.freeze({
  thumbnail: "thumbnail",
  main: "main",
});
const ATTRACTION_DETAIL_PHOTO_LIMIT = 4;

const getPublicApiBaseUrl = () =>
  String(env.OPENAPI_SERVER_URL || `http://localhost:${env.PORT}`).replace(/\/$/, "");

const buildAttractionPhotoUrl = (
  record,
  variant = ATTRACTION_PHOTO_VARIANTS.main
) => {
  const attractionId = readRecordValue(record, ["id"], null);

  if (!attractionId) {
    return null;
  }

  return `${getPublicApiBaseUrl()}/api/attractions/${encodeURIComponent(
    String(attractionId)
  )}/photo?variant=${variant}`;
};

const resolveAttractionImageUrl = (
  record,
  variant = ATTRACTION_PHOTO_VARIANTS.main
) => {
  const storedUrl =
    variant === ATTRACTION_PHOTO_VARIANTS.thumbnail
      ? readRecordValue(record, ["thumbnailImageUrl"], null)
      : readRecordValue(record, ["mainImageUrl"], null);

  return storedUrl || buildAttractionPhotoUrl(record, variant);
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
  const cityIndex = addressParts.findIndex(
    (part) => part.toLowerCase() === cityName.toLowerCase()
  );

  if (cityIndex > 0) {
    return `${addressParts[cityIndex - 1]}, ${cityName}`;
  }

  if (destinationName && cityIndex === -1) {
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

const buildAttractionPhotoGallery = (record) => {
  const gallery = [];
  const seenUrls = new Set();
  const candidates = [
    {
      type: ATTRACTION_PHOTO_VARIANTS.main,
      url: resolveAttractionImageUrl(record, ATTRACTION_PHOTO_VARIANTS.main),
    },
    {
      type: ATTRACTION_PHOTO_VARIANTS.thumbnail,
      url: resolveAttractionImageUrl(record, ATTRACTION_PHOTO_VARIANTS.thumbnail),
    },
    {
      type: ATTRACTION_PHOTO_VARIANTS.main,
      url: buildAttractionPhotoUrl(record, ATTRACTION_PHOTO_VARIANTS.main),
    },
    {
      type: ATTRACTION_PHOTO_VARIANTS.thumbnail,
      url: buildAttractionPhotoUrl(record, ATTRACTION_PHOTO_VARIANTS.thumbnail),
    },
  ];

  for (const candidate of candidates) {
    if (!candidate.url || seenUrls.has(candidate.url)) {
      continue;
    }

    seenUrls.add(candidate.url);
    gallery.push(candidate);

    if (gallery.length >= ATTRACTION_DETAIL_PHOTO_LIMIT) {
      break;
    }
  }

  return gallery;
};

const serializeAttractionCategory = (record) => ({
  id: readRecordValue(record, ["id"]),
  name: readRecordValue(record, ["name"], ""),
  slug: readRecordValue(record, ["slug"], ""),
});

const getProductPreferenceBucketKey = (categories = []) => {
  const categorySlugs = (
    categories
      .map((category) => readRecordValue(category, ["slug"], ""))
      .filter(Boolean)
  );
  return getPreferenceBucketForCategorySlugs(categorySlugs);
};

const serializePrimaryPreferenceBucket = (categories = []) => {
  const slug = getProductPreferenceBucketKey(categories);

  return {
    slug,
    name: getPreferenceDisplayName(slug, slug),
  };
};

const serializeAttraction = (record, options = {}) => {
  const categories = options.categories || [];
  const attraction = {
    id: readRecordValue(record, ["id"]),
    destinationId: readRecordValue(record, ["destinationId"]),
    name: readRecordValue(record, ["name"], ""),
    slug: readRecordValue(record, ["slug"], ""),
    description: readRecordValue(record, ["description"], ""),
    fullAddress: readRecordValue(record, ["fullAddress"], ""),
    latitude: readRecordValue(record, ["latitude"], null),
    longitude: readRecordValue(record, ["longitude"], null),
    estimatedDurationMinutes: readRecordValue(record, ["estimatedDurationMinutes"], null),
    openingHours: normalizeOpeningHours(
      readRecordValue(record, ["openingHours"], null)
    ),
    rating: readRecordValue(record, ["rating"], null),
    thumbnailImageUrl: resolveAttractionImageUrl(
      record,
      ATTRACTION_PHOTO_VARIANTS.thumbnail
    ),
    mainImageUrl: resolveAttractionImageUrl(record, ATTRACTION_PHOTO_VARIANTS.main),
    metadata: readRecordValue(record, ["metadata"], {}),
    enrichment: {
      externalSource: readRecordValue(record, ["externalSource"], null),
      externalPlaceId: readRecordValue(record, ["externalPlaceId"], null),
      externalRating: readRecordValue(record, ["externalRating"], null),
      externalReviewCount: readRecordValue(record, ["externalReviewCount"], null),
      externalLastSyncedAt: readRecordValue(record, ["externalLastSyncedAt"], null),
    },
    primaryPreference: serializePrimaryPreferenceBucket(categories),
  };

  if (options.includeDetailFields) {
    attraction.shortLocation = deriveShortLocation(record, options.destination);
    attraction.photos = buildAttractionPhotoGallery(record);
  }

  if (options.destination) {
    attraction.destination = serializeDestination(options.destination);
  }

  if (options.categories) {
    attraction.categories = categories.map(serializeAttractionCategory);
  }

  return attraction;
};

const loadAttractionCategoriesByAttractionIds = async (db, attractionIds) => {
  if (!attractionIds.length || !db.AttractionCategory || !db.AttractionCategoryMapping) {
    return new Map();
  }

  const mappings = await db.AttractionCategoryMapping.findAll({
    where: {
      attractionId: { [Op.in]: attractionIds },
    },
  });

  const categoryIds = mappings
    .map((mapping) => readRecordValue(mapping, ["attractionCategoryId", "attraction_category_id"]))
    .filter(Boolean);

  if (!categoryIds.length) {
    return new Map();
  }

  const categories = await db.AttractionCategory.findAll({
    where: { id: categoryIds },
  });

  const categoriesById = new Map(
    categories.map((category) => [readRecordValue(category, ["id"]), category])
  );
  const result = new Map();

  for (const mapping of mappings) {
    const attractionId = readRecordValue(mapping, ["attractionId", "attraction_id"]);
    const categoryId = readRecordValue(mapping, ["attractionCategoryId"]);

    if (!result.has(attractionId)) {
      result.set(attractionId, []);
    }

    if (categoriesById.has(categoryId)) {
      result.get(attractionId).push(categoriesById.get(categoryId));
    }
  }

  return result;
};

module.exports = {
  ATTRACTION_PHOTO_VARIANTS,
  buildAttractionPhotoGallery,
  buildAttractionPhotoUrl,
  deriveShortLocation,
  getProductPreferenceBucketKey,
  loadAttractionCategoriesByAttractionIds,
  resolveAttractionImageUrl,
  serializeAttraction,
  serializeAttractionCategory,
  serializePrimaryPreferenceBucket,
};
