const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { attractionsService } = require("./attractions.service");

const listByDestination = asyncHandler(async (req, res) => {
  const data = await attractionsService.listByDestination(
    req.params.destinationId,
    req.query.categoryIds || []
  );

  return sendSuccess(res, { message: "Attractions fetched.", data });
});

const getAttraction = asyncHandler(async (req, res) => {
  const data = await attractionsService.getDetail(req.params.idOrSlug);
  return sendSuccess(res, { message: "Attraction fetched.", data });
});

module.exports = {
  getAttraction,
  listByDestination,
};
