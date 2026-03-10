const express = require("express");
const { validate } = require("../../middlewares/validate");
const { getDestination, listDestinations } = require("./destinations.controller");
const { destinationDetailParamsSchema } = require("./destinations.validators");

const destinationsRouter = express.Router();

destinationsRouter.get("/", listDestinations);
destinationsRouter.get("/:idOrSlug", validate({ params: destinationDetailParamsSchema }), getDestination);

module.exports = { destinationsRouter };
