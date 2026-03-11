const express = require("express");
const { validate } = require("../../middlewares/validate");
const {
  getAttraction,
  getAttractionPhoto,
  listByDestination,
} = require("./attractions.controller");
const {
  attractionDetailParamsSchema,
  attractionPhotoQuerySchema,
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
attractionsRouter.get(
  "/attractions/:idOrSlug/photo",
  validate({
    params: attractionDetailParamsSchema,
    query: attractionPhotoQuerySchema,
  }),
  getAttractionPhoto
);

module.exports = { attractionsRouter };
