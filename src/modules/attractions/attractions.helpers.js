const { Op } = require("sequelize");
const env = require("../../config/env");
const { readRecordValue } = require("../../utils/model-helpers");
const { serializeDestination } = require("../destinations/destinations.helpers");

const ATTRACTION_PHOTO_VARIANTS = Object.freeze({
  thumbnail: "thumbnail",
  main: "main",
});

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

const serializeAttractionCategory = (record) => ({
  id: readRecordValue(record, ["id"]),
  name: readRecordValue(record, ["name"], ""),
  slug: readRecordValue(record, ["slug"], ""),
});

const serializeAttraction = (record, options = {}) => {
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
    openingHours: readRecordValue(record, ["openingHours"], null),
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
  };

  if (options.destination) {
    attraction.destination = serializeDestination(options.destination);
  }

  if (options.categories) {
    attraction.categories = options.categories.map(serializeAttractionCategory);
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
  buildAttractionPhotoUrl,
  loadAttractionCategoriesByAttractionIds,
  resolveAttractionImageUrl,
  serializeAttraction,
  serializeAttractionCategory,
};
