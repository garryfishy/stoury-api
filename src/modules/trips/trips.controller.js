const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { tripsService } = require("./trips.service");

const createTrip = asyncHandler(async (req, res) => {
  const data = await tripsService.createTrip(req.auth.userId, req.body);
  return sendSuccess(res, { statusCode: 201, message: "Trip created.", data });
});

const listMyTrips = asyncHandler(async (req, res) => {
  const data = await tripsService.listMyTrips(req.auth.userId);
  return sendSuccess(res, { message: "Trips fetched.", data });
});

const getTrip = asyncHandler(async (req, res) => {
  const data = await tripsService.getTripDetail(req.auth.userId, req.params.tripId);
  return sendSuccess(res, { message: "Trip fetched.", data });
});

const updateTrip = asyncHandler(async (req, res) => {
  const data = await tripsService.updateTrip(req.auth.userId, req.params.tripId, req.body);
  return sendSuccess(res, { message: "Trip updated.", data });
});

module.exports = {
  createTrip,
  getTrip,
  listMyTrips,
  updateTrip,
};
