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
      description: "Returns the active curated destinations available for trip planning.",
      responses: {
        200: successResponse(
          "Destinations fetched.",
          {
            type: "array",
            items: schemaRef("Destination"),
          },
          successExample("Destinations fetched.", [destination])
        ),
      },
    },
  },
  "/api/destinations/{idOrSlug}": {
    get: {
      tags: ["Destinations"],
      summary: "Get destination details",
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
