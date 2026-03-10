const express = require("express");
const { authenticate } = require("../../middlewares/authenticate");
const { validate } = require("../../middlewares/validate");
const {
  getTripItinerary,
  saveTripItinerary,
} = require("./itineraries.controller");
const {
  saveItinerarySchema,
  tripItineraryParamsSchema,
} = require("./itineraries.validators");

const itinerariesRouter = express.Router();

itinerariesRouter.use(authenticate);
itinerariesRouter.get(
  "/:tripId/itinerary",
  validate({ params: tripItineraryParamsSchema }),
  getTripItinerary
);
itinerariesRouter.put(
  "/:tripId/itinerary",
  validate({
    params: tripItineraryParamsSchema,
    body: saveItinerarySchema,
  }),
  saveTripItinerary
);

module.exports = { itinerariesRouter };
