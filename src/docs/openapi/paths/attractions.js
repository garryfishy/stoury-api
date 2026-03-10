const { attraction, destination } = require("../examples");
const {
  parameterRef,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const attractionsPaths = {
  "/api/destinations/{destinationId}/attractions": {
    get: {
      tags: ["Attractions"],
      summary: "List attractions for a destination",
      description:
        "Public read-only curated attraction catalog for the MVP. Admin CRUD is intentionally excluded and reserved for a future operational surface.",
      parameters: [
        parameterRef("DestinationIdParam"),
        parameterRef("AttractionCategoryIdsQuery"),
      ],
      responses: {
        200: successResponse(
          "Attractions fetched.",
          schemaRef("DestinationAttractionCollection"),
          successExample("Attractions fetched.", {
            destination,
            items: [attraction],
          })
        ),
        404: responseRef("NotFound"),
        422: {
          description: "Invalid destination UUID or unknown attraction category filter.",
          content: {
            "application/json": {
              schema: schemaRef("ErrorResponse"),
              example: {
                success: false,
                message: "One or more attraction categories do not exist.",
                data: null,
              },
            },
          },
        },
      },
    },
  },
  "/api/attractions/{idOrSlug}": {
    get: {
      tags: ["Attractions"],
      summary: "Get attraction details",
      description:
        "Public read-only attraction detail endpoint. Admin CRUD is intentionally excluded from the MVP API surface.",
      parameters: [parameterRef("IdOrSlugParam")],
      responses: {
        200: successResponse(
          "Attraction fetched.",
          schemaRef("Attraction"),
          successExample("Attraction fetched.", attraction)
        ),
        404: responseRef("NotFound"),
        422: responseRef("ValidationError"),
      },
    },
  },
};

module.exports = { attractionsPaths };
