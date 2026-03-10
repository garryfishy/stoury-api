const { Op } = require("sequelize");
const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const {
  buildPaginationMeta,
  getPaginationOffset,
  normalizePagination,
} = require("../../utils/pagination");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  findDestinationByIdOrSlug,
  isUuidIdentifier,
  serializeDestination,
} = require("../destinations/destinations.helpers");
const {
  loadAttractionCategoriesByAttractionIds,
  serializeAttraction,
} = require("./attractions.helpers");

const createAttractionsService = ({ dbProvider = getDb } = {}) => ({
  async listByDestination(destinationId, query = {}) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const Attraction = getRequiredModel(db, "Attraction");
    const AttractionCategory = db.AttractionCategory || null;
    const pagination = normalizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 12,
    });
    const rawCategoryIds = query.categoryIds;
    const normalizedCategoryIds = Array.isArray(rawCategoryIds)
      ? rawCategoryIds
      : typeof rawCategoryIds === "string"
        ? rawCategoryIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

    const destination = await Destination.findByPk(destinationId);

    if (!destination) {
      throw new AppError("Destination not found.", 404);
    }

    const where = {
      destinationId,
      isActive: true,
    };

    if (normalizedCategoryIds.length) {
      if (!AttractionCategory) {
        throw new AppError("Attraction categories are not available.", 500);
      }

      const categories = await AttractionCategory.findAll({
        where: {
          id: normalizedCategoryIds,
          isActive: true,
        },
      });

      if (categories.length !== normalizedCategoryIds.length) {
        throw new AppError("One or more attraction categories do not exist.", 422);
      }

      const Mapping = getRequiredModel(db, "AttractionCategoryMapping");
      const mappings = await Mapping.findAll({
        where: {
          attractionCategoryId: normalizedCategoryIds,
        },
      });

      const attractionIds = [
        ...new Set(
          mappings.map((mapping) => readRecordValue(mapping, ["attractionId"])).filter(Boolean)
        ),
      ];

      if (!attractionIds.length) {
        return {
          destination: serializeDestination(destination),
          items: [],
          pagination: buildPaginationMeta({
            page: pagination.page,
            limit: pagination.limit,
            total: 0,
          }),
        };
      }

      where.id = { [Op.in]: attractionIds };
    }

    const total = await Attraction.count({ where });
    const attractions = await Attraction.findAll({
      where,
      order: [["name", "ASC"]],
      limit: pagination.limit,
      offset: getPaginationOffset(pagination),
    });

    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      attractions.map((attraction) => readRecordValue(attraction, ["id"]))
    );

    return {
      destination: serializeDestination(destination),
      items: attractions.map((attraction) =>
        serializeAttraction(attraction, {
          categories: categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [],
        })
      ),
      pagination: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async getDetail(idOrSlug) {
    const db = dbProvider();
    const Attraction = getRequiredModel(db, "Attraction");
    const Destination = getRequiredModel(db, "Destination");

    const attraction = isUuidIdentifier(idOrSlug)
      ? await Attraction.findByPk(String(idOrSlug))
      : await Attraction.findOne({ where: { slug: idOrSlug, isActive: true } });

    if (!attraction || !attraction.isActive) {
      throw new AppError("Attraction not found.", 404);
    }

    const destinationId = readRecordValue(attraction, ["destinationId"]);
    const destination = destinationId
      ? await findDestinationByIdOrSlug(Destination, String(destinationId))
      : null;

    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(db, [
      readRecordValue(attraction, ["id"]),
    ]);

    return serializeAttraction(attraction, {
      destination,
      categories: categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [],
    });
  },
});

const attractionsService = createAttractionsService();

module.exports = {
  attractionsService,
  createAttractionsService,
};
