const { asyncHandler } = require("../../utils/async-handler");
const { sendSuccess } = require("../../utils/response");
const { authService } = require("./auth.service");

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  return sendSuccess(res, { statusCode: 201, message: "User registered.", data });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return sendSuccess(res, { message: "Login successful.", data });
});

const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body.refreshToken);
  return sendSuccess(res, { message: "Token refreshed.", data });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  return sendSuccess(res, { message: "Logout successful.", data: null });
});

module.exports = {
  login,
  logout,
  refresh,
  register,
};
