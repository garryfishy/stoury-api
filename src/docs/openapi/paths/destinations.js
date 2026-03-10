const { destination } = require("../examples");
const {
  parameterRef,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const destinationsPaths = {
  "/api/destinations": {
    get: {
      tags: ["Destinations"],
      summary: "List curated destinations",
      description:
        "Returns the curated destination catalog in a paginated response. Inactive destinations may still appear with `isActive: false` so the frontend can render them as disabled.",
      parameters: [parameterRef("PageQuery"), parameterRef("CatalogLimitQuery")],
      responses: {
        200: successResponse(
          "Destinations fetched.",
          {
            type: "array",
            items: schemaRef("Destination"),
          },
          successExample("Destinations fetched.", [destination], {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          }),
          schemaRef("PaginationMeta")
        ),
      },
    },
  },
  "/api/destinations/{idOrSlug}": {
    get: {
      tags: ["Destinations"],
      summary: "Get destination details",
      description:
        "Returns destination details even when the destination is currently inactive for trip planning.",
      parameters: [parameterRef("IdOrSlugParam")],
      responses: {
        200: successResponse(
          "Destination fetched.",
          schemaRef("Destination"),
          successExample("Destination fetched.", destination)
        ),
        404: responseRef("NotFound"),
        422: responseRef("ValidationError"),
      },
    },
  },
};

module.exports = { destinationsPaths };
