const { saveItineraryRequest, tripItinerary } = require("../examples");
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

const itinerariesPaths = {
  "/api/trips/{tripId}/itinerary": {
    get: {
      tags: ["Itineraries"],
      summary: "Get the saved itinerary for a trip",
      description:
        "Returns the structured itinerary payload for the authenticated user's trip. Trips without a saved itinerary still return the trip framing with an empty `days` array.",
      security: [{ bearerAuth: [] }],
      parameters: [parameterRef("TripIdParam")],
      responses: {
        200: successResponse(
          "Itinerary fetched.",
          schemaRef("ItineraryResponse"),
          successExample("Itinerary fetched.", tripItinerary)
        ),
        401: responseRef("Unauthorized"),
        404: responseRef("NotFound"),
        422: responseRef("ValidationError"),
      },
    },
    put: {
      tags: ["Itineraries"],
      summary: "Save the complete itinerary for a trip",
      description:
        "Replaces the full itinerary snapshot for the authenticated user's trip. The MVP accepts up to 30 days and 12 items per day; if `date` is supplied for a day it must match the server-derived trip date.",
      security: [{ bearerAuth: [] }],
      parameters: [parameterRef("TripIdParam")],
      requestBody: requestBody(
        schemaRef("SaveItineraryRequest"),
        saveItineraryRequest,
        "Complete itinerary payload. Attraction IDs must belong to the trip destination and cannot repeat within the same trip."
      ),
      responses: {
        200: successResponse(
          "Itinerary saved.",
          schemaRef("ItineraryResponse"),
          successExample("Itinerary saved.", tripItinerary)
        ),
        401: responseRef("Unauthorized"),
        404: responseRef("NotFound"),
        422: errorResponse(
          "The itinerary payload failed business validation.",
          errorExample("Attraction 33333333-3333-4333-8333-333333333333 belongs to another destination.")
        ),
      },
    },
  },
};

module.exports = { itinerariesPaths };
