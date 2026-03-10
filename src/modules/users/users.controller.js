const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { usersService } = require("./users.service");

const getMe = asyncHandler(async (req, res) => {
  const data = await usersService.getProfile(req.auth.userId);
  return sendSuccess(res, { message: "Profile fetched.", data });
});

const updateMe = asyncHandler(async (req, res) => {
  const data = await usersService.updateProfile(req.auth.userId, req.body);
  return sendSuccess(res, { message: "Profile updated.", data });
});

module.exports = {
  getMe,
  updateMe,
};
