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
      description:
        "Returns both manual and ai_assisted trips for the authenticated user, including the stored trip budget on every item.",
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
      summary: "Create a manual or AI-assisted trip and snapshot preferences",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        description:
          "Create either a `manual` or `ai_assisted` trip. Both planning modes use the same required trip-level `budget` field, and the trip always stores that budget even if AI preview is never used. Only active destinations can be used for trip planning.",
        content: {
          "application/json": {
            schema: schemaRef("CreateTripRequest"),
            examples: {
              manualTrip: {
                summary: "Create a manual trip with budget",
                value: {
                  title: "Batam long weekend",
                  destinationId: trip.destinationId,
                  planningMode: "manual",
                  startDate: trip.startDate,
                  endDate: trip.endDate,
                  budget: 2500000,
                  preferenceSource: "profile",
                },
              },
              aiAssistedTrip: {
                summary: "Create an AI-assisted trip with budget",
                value: {
                  title: "Batam AI long weekend",
                  destinationId: trip.destinationId,
                  planningMode: "ai_assisted",
                  startDate: "2026-05-15",
                  endDate: "2026-05-17",
                  budget: 3500000,
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
          "Invalid, inactive, or unknown destination or preference IDs.",
          errorExample("Destination is inactive and cannot be used for trip planning.")
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
        "Title, budget, and preference snapshots are always editable. The same trip-level budget field is used for both manual and ai_assisted trips. Switching a trip to an inactive destination is rejected. Destination, planning mode, and date range changes are rejected once an itinerary exists.",
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
        422: errorResponse(
          "Invalid, inactive, or unknown trip update payload.",
          errorExample("Destination is inactive and cannot be used for trip planning.")
        ),
      },
    },
  },
};

module.exports = { tripsPaths };
