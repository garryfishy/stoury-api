const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { findDestinationByIdOrSlug, serializeDestination } = require("./destinations.helpers");

const createDestinationsService = ({ dbProvider = getDb } = {}) => ({
  async listDestinations() {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");

    // TODO: Add pagination before the public destination catalog grows beyond MVP scale.
    const destinations = await Destination.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    });

    return destinations.map(serializeDestination);
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
