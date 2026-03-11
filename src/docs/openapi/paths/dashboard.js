const { dashboardHome } = require("../examples");
const {
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const dashboardPaths = {
  "/api/dashboard/home": {
    get: {
      tags: ["Dashboard"],
      summary: "Get the Batam-first mobile dashboard home payload",
      description:
        "Returns the current MVP dashboard home payload using the backend default dashboard destination, which is Batam-first today. Grouping is algorithmic rather than editorial: `featured` contains the highest-popularity attractions, and `exploreMore` contains the next ranked attractions for the same destination.",
      responses: {
        200: successResponse(
          "Dashboard home fetched.",
          schemaRef("DashboardHomeResponse"),
          successExample("Dashboard home fetched.", dashboardHome)
        ),
      },
    },
  },
};

module.exports = { dashboardPaths };
