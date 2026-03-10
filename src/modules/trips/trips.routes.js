const express = require("express");
const { authenticate } = require("../../middlewares/authenticate");
const { validate } = require("../../middlewares/validate");
const { createTrip, getTrip, listMyTrips, updateTrip } = require("./trips.controller");
const { createTripSchema, tripParamsSchema, updateTripSchema } = require("./trips.validators");

const tripsRouter = express.Router();

tripsRouter.use(authenticate);
tripsRouter.get("/", listMyTrips);
tripsRouter.post("/", validate({ body: createTripSchema }), createTrip);
tripsRouter.get("/:tripId", validate({ params: tripParamsSchema }), getTrip);
tripsRouter.patch(
  "/:tripId",
  validate({ params: tripParamsSchema, body: updateTripSchema }),
  updateTrip
);

module.exports = { tripsRouter };
