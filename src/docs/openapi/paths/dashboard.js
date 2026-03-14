const { dashboardHome, dashboardSearchResults } = require("../examples");
const {
  parameterRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const dashboardPaths = {
  "/api/dashboard/home": {
    get: {
      tags: ["Dashboard"],
      summary: "Get the global mobile dashboard home payload",
      description:
        "Returns the current MVP dashboard home payload using all active destinations. The backend ranks active attractions globally by popularity, takes the top 20 candidates, and returns 4 randomized featured cards from that pool on each request.",
      responses: {
        200: successResponse(
          "Dashboard home fetched.",
          schemaRef("DashboardHomeResponse"),
          successExample("Dashboard home fetched.", dashboardHome)
        ),
      },
    },
  },
  "/api/dashboard/search": {
    get: {
      tags: ["Dashboard"],
      summary: "Search active attractions across all active destinations",
      description:
        "Returns a global dashboard search result set across active attractions from all active destinations. Results are ranked by the existing popularity logic, not grouped by destination.",
      parameters: [
        parameterRef("AttractionSearchQuery"),
        parameterRef("PageQuery"),
        {
          name: "limit",
          in: "query",
          required: false,
          description: "Maximum number of search results to return per page.",
          schema: {
            type: "integer",
            default: 12,
            minimum: 1,
            maximum: 100,
          },
        },
      ],
      responses: {
        200: successResponse(
          "Dashboard attractions fetched.",
          schemaRef("DashboardSearchResponse"),
          successExample("Dashboard attractions fetched.", dashboardSearchResults),
          schemaRef("PaginationMeta")
        ),
        422: {
          description: "Search query is missing or invalid.",
          content: {
            "application/json": {
              schema: schemaRef("ErrorResponse"),
              example: {
                success: false,
                message: "Search query is required.",
                data: null,
              },
            },
          },
        },
      },
    },
  },
};

module.exports = { dashboardPaths };
