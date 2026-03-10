const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { preferencesService } = require("./preferences.service");

const getMine = asyncHandler(async (req, res) => {
  const data = await preferencesService.getMyPreferences(req.auth.userId);
  return sendSuccess(res, { message: "Preferences fetched.", data });
});

const replaceMine = asyncHandler(async (req, res) => {
  const data = await preferencesService.replaceMyPreferences(
    req.auth.userId,
    req.body.categoryIds
  );

  return sendSuccess(res, { message: "Preferences updated.", data });
});

module.exports = {
  getMine,
  replaceMine,
};
