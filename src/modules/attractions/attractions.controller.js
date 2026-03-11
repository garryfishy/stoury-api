const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { attractionsService } = require("./attractions.service");

const listByDestination = asyncHandler(async (req, res) => {
  const { destination, items, pagination } = await attractionsService.listByDestination(
    req.params.destinationId,
    req.query
  );

  return sendSuccess(res, {
    message: "Attractions fetched.",
    data: {
      destination,
      items,
    },
    meta: pagination,
  });
});

const getAttraction = asyncHandler(async (req, res) => {
  const data = await attractionsService.getDetail(req.params.idOrSlug);
  return sendSuccess(res, { message: "Attraction fetched.", data });
});

const getAttractionPhoto = asyncHandler(async (req, res) => {
  const asset = await attractionsService.getPhotoAsset(
    req.params.idOrSlug,
    req.query.variant
  );

  if (asset.cacheControl) {
    res.set("Cache-Control", asset.cacheControl);
  }

  if (asset.type === "redirect") {
    return res.redirect(asset.statusCode || 302, asset.location);
  }

  if (asset.contentType) {
    res.type(asset.contentType);
  }

  return res.status(asset.statusCode || 200).send(asset.body);
});

module.exports = {
  getAttraction,
  getAttractionPhoto,
  listByDestination,
};
