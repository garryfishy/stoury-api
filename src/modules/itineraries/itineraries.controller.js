const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { itinerariesService } = require("./itineraries.service");

const getTripItinerary = asyncHandler(async (req, res) => {
  const data = await itinerariesService.getTripItinerary(
    req.auth.userId,
    req.params.tripId
  );

  return sendSuccess(res, {
    message: "Trip itinerary fetched.",
    data,
  });
});

const saveTripItinerary = asyncHandler(async (req, res) => {
  const data = await itinerariesService.saveTripItinerary(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendSuccess(res, {
    message: "Trip itinerary saved.",
    data,
  });
});

module.exports = {
  getTripItinerary,
  saveTripItinerary,
};
