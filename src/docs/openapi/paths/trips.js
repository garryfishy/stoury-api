const { preferences, trip, tripSummary } = require("../examples");
const {
  errorExample,
  errorResponse,
  parameterRef,
  requestBody,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const tripsPaths = {
  "/api/trips": {
    get: {
      tags: ["Trips"],
      summary: "List the authenticated user's trips",
      security: [{ bearerAuth: [] }],
      responses: {
        200: successResponse(
          "Trips fetched.",
          {
            type: "array",
            items: schemaRef("Trip"),
          },
          successExample("Trips fetched.", [tripSummary])
        ),
        401: responseRef("Unauthorized"),
      },
    },
    post: {
      tags: ["Trips"],
      summary: "Create a trip and snapshot preferences",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        description:
          "Create a trip and snapshot either the current profile preferences or a custom set of preference category IDs.",
        content: {
          "application/json": {
            schema: schemaRef("CreateTripRequest"),
            examples: {
              profilePreferences: {
                summary: "Create trip using current profile preferences",
                value: {
                  title: "Batam long weekend",
                  destinationId: trip.destinationId,
                  planningMode: trip.planningMode,
                  startDate: trip.startDate,
                  endDate: trip.endDate,
                  budget: 2500000,
                  preferenceSource: "profile",
                },
              },
              customPreferences: {
                summary: "Create trip using custom preference categories",
                value: {
                  title: "Batam long weekend",
                  destinationId: trip.destinationId,
                  planningMode: trip.planningMode,
                  startDate: trip.startDate,
                  endDate: trip.endDate,
                  budget: 2500000,
                  preferenceSource: "custom",
                  preferenceCategoryIds: preferences.map((item) => item.id),
                },
              },
            },
          },
        },
      },
      responses: {
        201: successResponse(
          "Trip created.",
          schemaRef("Trip"),
          successExample("Trip created.", trip)
        ),
        401: responseRef("Unauthorized"),
        409: errorResponse(
          "Trip overlaps an existing trip for the same destination.",
          errorExample(
            "You already have an overlapping trip for this destination in the selected date range."
          )
        ),
        422: errorResponse(
          "Invalid destination or preference IDs.",
          errorExample("Destination not found.")
        ),
      },
    },
  },
  "/api/trips/{tripId}": {
    get: {
      tags: ["Trips"],
      summary: "Get trip details",
      security: [{ bearerAuth: [] }],
      parameters: [parameterRef("TripIdParam")],
      responses: {
        200: successResponse(
          "Trip fetched.",
          schemaRef("Trip"),
          successExample("Trip fetched.", trip)
        ),
        401: responseRef("Unauthorized"),
        404: responseRef("NotFound"),
        422: responseRef("ValidationError"),
      },
    },
    patch: {
      tags: ["Trips"],
      summary: "Update an existing trip",
      description:
        "Title, budget, and preference snapshots are always editable. Destination, planning mode, and date range changes are rejected once an itinerary exists.",
      security: [{ bearerAuth: [] }],
      parameters: [parameterRef("TripIdParam")],
      requestBody: requestBody(schemaRef("UpdateTripRequest"), {
        title: "Batam family weekend",
        budget: 3000000,
        preferenceSource: "profile",
      }),
      responses: {
        200: successResponse(
          "Trip updated.",
          schemaRef("Trip"),
          successExample("Trip updated.", {
            ...trip,
            title: "Batam family weekend",
            budget: "3000000.00",
          })
        ),
        401: responseRef("Unauthorized"),
        404: responseRef("NotFound"),
        409: errorResponse(
          "Trip update conflicts with itinerary or overlap rules.",
          errorExample(
            "Trips with an existing itinerary can only update title, budget, and preference snapshots in MVP."
          )
        ),
        422: responseRef("ValidationError"),
      },
    },
  },
};

module.exports = { tripsPaths };
