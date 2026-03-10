const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { aiPlanningService } = require("./ai-planning.service");

const generateAiTripPreview = asyncHandler(async (req, res) => {
  const data = await aiPlanningService.generatePreview(
    req.auth.userId,
    req.params.tripId
  );

  return sendSuccess(res, {
    message: "AI itinerary preview generated.",
    data,
  });
});

module.exports = {
  generateAiTripPreview,
};
