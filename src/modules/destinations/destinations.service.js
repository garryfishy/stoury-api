const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const {
  buildPaginationMeta,
  getPaginationOffset,
  normalizePagination,
} = require("../../utils/pagination");
const { findDestinationByIdOrSlug, serializeDestination } = require("./destinations.helpers");

const createDestinationsService = ({ dbProvider = getDb } = {}) => ({
  async listDestinations(query = {}) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const pagination = normalizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 20,
    });

    const { count, rows } = await Destination.findAndCountAll({
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
      limit: pagination.limit,
      offset: getPaginationOffset(pagination),
    });

    return {
      items: rows.map(serializeDestination),
      pagination: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total: count,
      }),
    };
  },

  async getDestination(idOrSlug) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");

    const destination = await findDestinationByIdOrSlug(Destination, idOrSlug);

    if (!destination) {
      throw new AppError("Destination not found.", 404);
    }

    return serializeDestination(destination);
  },
});

const destinationsService = createDestinationsService();

module.exports = {
  createDestinationsService,
  destinationsService,
};
