const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { destinationsService } = require("./destinations.service");

const listDestinations = asyncHandler(async (req, res) => {
  const { items, pagination } = await destinationsService.listDestinations(req.query);

  return sendSuccess(res, {
    message: "Destinations fetched.",
    data: items,
    meta: pagination,
  });
});

const getDestination = asyncHandler(async (req, res) => {
  const data = await destinationsService.getDestination(req.params.idOrSlug);
  return sendSuccess(res, { message: "Destination fetched.", data });
});

module.exports = {
  getDestination,
  listDestinations,
};
