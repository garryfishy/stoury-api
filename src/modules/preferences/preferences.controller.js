const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { preferencesService } = require("./preferences.service");

const listAll = asyncHandler(async (_req, res) => {
  const data = await preferencesService.listPreferences();
  return sendSuccess(res, { message: "Preference categories fetched.", data });
});

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
  listAll,
  getMine,
  replaceMine,
};
