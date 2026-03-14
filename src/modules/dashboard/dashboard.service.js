const {
  DASHBOARD_SEARCH_DEFAULT_LIMIT,
} = require("../../config/dashboard");
const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  buildPaginationMeta,
  getPaginationOffset,
  normalizePagination,
} = require("../../utils/pagination");
const { Op } = require("sequelize");
const {
  loadAttractionCategoriesByAttractionIds,
} = require("../attractions/attractions.helpers");
const {
  buildDashboardHomePayload,
  getPopularityScore,
  serializeDashboardCard,
} = require("./dashboard.helpers");

const createDashboardService = ({
  dbProvider = getDb,
  randomFn = Math.random,
} = {}) => ({
  async getHome() {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const Attraction = getRequiredModel(db, "Attraction");
    const destinations = await Destination.findAll({
      where: {
        isActive: true,
      },
      order: [["name", "ASC"]],
    });
    const destinationIds = destinations.map((destination) => readRecordValue(destination, ["id"]));

    if (!destinationIds.length) {
      throw new AppError("No active destinations are available for the dashboard.", 500);
    }
    const destinationMap = new Map(
      destinations.map((destination) => [readRecordValue(destination, ["id"]), destination])
    );

    const attractions = await Attraction.findAll({
      where: {
        destinationId: {
          [Op.in]: destinationIds,
        },
        isActive: true,
      },
      order: [["name", "ASC"]],
    });

    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      attractions.map((attraction) => readRecordValue(attraction, ["id"]))
    );

    return buildDashboardHomePayload({
      randomFn,
      items: attractions.map((attraction) => {
        const categories =
          categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [];
        const destination = destinationMap.get(readRecordValue(attraction, ["destinationId"]));

        return {
          name: readRecordValue(attraction, ["name"], ""),
          popularityScore: getPopularityScore(attraction),
          card: serializeDashboardCard(attraction, {
            destination,
            categories,
          }),
        };
      }),
    });
  },

  async searchAttractions(query = {}) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const Attraction = getRequiredModel(db, "Attraction");
    const pagination = normalizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: DASHBOARD_SEARCH_DEFAULT_LIMIT,
    });
    const searchTerm =
      typeof query.q === "string" && query.q.trim().length ? query.q.trim() : null;

    if (!searchTerm) {
      throw new AppError("Search query is required.", 422);
    }

    const destinations = await Destination.findAll({
      where: {
        isActive: true,
      },
      order: [["name", "ASC"]],
    });
    const destinationIds = destinations.map((destination) => readRecordValue(destination, ["id"]));

    if (!destinationIds.length) {
      return {
        items: [],
        pagination: buildPaginationMeta({
          page: pagination.page,
          limit: pagination.limit,
          total: 0,
        }),
      };
    }

    const destinationMap = new Map(
      destinations.map((destination) => [readRecordValue(destination, ["id"]), destination])
    );
    const attractions = await Attraction.findAll({
      where: {
        destinationId: {
          [Op.in]: destinationIds,
        },
        isActive: true,
        [Op.or]: [
          {
            name: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            slug: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            fullAddress: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ],
      },
      order: [["name", "ASC"]],
    });
    const sortedAttractions = [...attractions].sort((left, right) => {
      const popularityDelta = getPopularityScore(right) - getPopularityScore(left);

      if (popularityDelta !== 0) {
        return popularityDelta;
      }

      return String(readRecordValue(left, ["name"], "")).localeCompare(
        String(readRecordValue(right, ["name"], ""))
      );
    });
    const pagedAttractions = sortedAttractions.slice(
      getPaginationOffset(pagination),
      getPaginationOffset(pagination) + pagination.limit
    );
    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      pagedAttractions.map((attraction) => readRecordValue(attraction, ["id"]))
    );

    return {
      items: pagedAttractions.map((attraction) => {
        const categories =
          categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [];

        return serializeDashboardCard(attraction, {
          destination: destinationMap.get(readRecordValue(attraction, ["destinationId"])),
          categories,
        });
      }),
      pagination: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total: sortedAttractions.length,
      }),
      query: searchTerm,
    };
  },
});

const dashboardService = createDashboardService();

module.exports = {
  createDashboardService,
  dashboardService,
};
