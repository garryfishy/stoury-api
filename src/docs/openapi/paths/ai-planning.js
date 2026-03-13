const { aiPlanningPreview } = require("../examples");
const {
  errorExample,
  errorResponse,
  parameterRef,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const aiPlanningPaths = {
  "/api/trips/{tripId}/ai-generate": {
    post: {
      tags: ["AI Planning"],
      summary: "Generate an AI itinerary preview for a trip",
      description:
        "Returns a non-persisted preview for an `ai_assisted` trip using the curated attraction catalog, the trip's snapped preferences, and the same trip-level `budget` field used by normal trip APIs. Budget fit is a rough planning signal only and never a guaranteed spend estimate. Preview items may also include rough per-stop budget estimate fields. This endpoint never saves the itinerary.",
      security: [{ bearerAuth: [] }],
      parameters: [parameterRef("TripIdParam")],
      responses: {
        200: successResponse(
          "AI itinerary preview generated.",
          schemaRef("AiPlanningPreview"),
          successExample("AI itinerary preview generated.", aiPlanningPreview)
        ),
        401: responseRef("Unauthorized"),
        404: responseRef("NotFound"),
        409: errorResponse(
          "Trip planning mode does not allow AI preview generation.",
          errorExample("AI itinerary preview is only available for ai_assisted trips.")
        ),
        422: errorResponse(
          "Curated destination data could not produce a valid preview.",
          errorExample("AI generation could not produce enough unique attractions to cover the trip date range.")
        ),
      },
    },
  },
};

module.exports = { aiPlanningPaths };
