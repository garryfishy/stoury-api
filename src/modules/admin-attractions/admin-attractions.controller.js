const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { adminAttractionsService } = require("./admin-attractions.service");

const listPendingEnrichment = asyncHandler(async (req, res) => {
  const data = await adminAttractionsService.listPendingEnrichment(req.query);

  return sendSuccess(res, {
    message: "Pending attraction enrichment fetched.",
    data,
  });
});

const enrichAttraction = asyncHandler(async (req, res) => {
  const data = await adminAttractionsService.enrichAttraction(req.params.attractionId);

  return sendSuccess(res, {
    message: "Attraction enrichment processed.",
    data,
  });
});

const enrichMissingAttractions = asyncHandler(async (req, res) => {
  const data = await adminAttractionsService.enrichMissing(req.body);

  return sendSuccess(res, {
    message: "Attraction batch enrichment processed.",
    data,
  });
});

const backfillAttractionPhotos = asyncHandler(async (req, res) => {
  const data = await adminAttractionsService.backfillPhotos(req.body);

  return sendSuccess(res, {
    message: "Attraction photo backfill processed.",
    data,
  });
});

module.exports = {
  backfillAttractionPhotos,
  enrichAttraction,
  enrichMissingAttractions,
  listPendingEnrichment,
};
