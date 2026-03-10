const express = require("express");
const { validate } = require("../../middlewares/validate");
const { getAttraction, listByDestination } = require("./attractions.controller");
const {
  attractionDetailParamsSchema,
  destinationAttractionsParamsSchema,
  listAttractionsQuerySchema,
} = require("./attractions.validators");

const attractionsRouter = express.Router();

attractionsRouter.get(
  "/destinations/:destinationId/attractions",
  validate({
    params: destinationAttractionsParamsSchema,
    query: listAttractionsQuerySchema,
  }),
  listByDestination
);
attractionsRouter.get(
  "/attractions/:idOrSlug",
  validate({ params: attractionDetailParamsSchema }),
  getAttraction
);

module.exports = { attractionsRouter };
