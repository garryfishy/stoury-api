const { Op } = require("sequelize");
const { readRecordValue } = require("../../utils/model-helpers");
const { serializeDestination } = require("../destinations/destinations.helpers");

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
    thumbnailImageUrl: readRecordValue(record, ["thumbnailImageUrl"], null),
    mainImageUrl: readRecordValue(record, ["mainImageUrl"], null),
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
  loadAttractionCategoriesByAttractionIds,
  serializeAttraction,
  serializeAttractionCategory,
};
