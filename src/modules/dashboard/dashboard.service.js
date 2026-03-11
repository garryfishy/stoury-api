const {
  DEFAULT_DASHBOARD_DESTINATION_SLUG,
} = require("../../config/dashboard");
const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  findDestinationByIdOrSlug,
} = require("../destinations/destinations.helpers");
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
  defaultDestinationSlug = DEFAULT_DASHBOARD_DESTINATION_SLUG,
} = {}) => ({
  async getHome({ destinationSlug = defaultDestinationSlug } = {}) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const Attraction = getRequiredModel(db, "Attraction");
    const destination = await findDestinationByIdOrSlug(Destination, destinationSlug);

    if (!destination || !readRecordValue(destination, ["isActive"], false)) {
      throw new AppError("Dashboard destination is not available.", 500);
    }

    const attractions = await Attraction.findAll({
      where: {
        destinationId: readRecordValue(destination, ["id"]),
        isActive: true,
      },
      order: [["name", "ASC"]],
    });

    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      attractions.map((attraction) => readRecordValue(attraction, ["id"]))
    );

    return buildDashboardHomePayload({
      destination,
      defaultDestinationSlug: destinationSlug,
      items: attractions.map((attraction) => {
        const categories =
          categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [];

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
});

const dashboardService = createDashboardService();

module.exports = {
  createDashboardService,
  dashboardService,
};
