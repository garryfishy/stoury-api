const express = require("express");
const { validate } = require("../../middlewares/validate");
const { authRateLimit } = require("../../middlewares/auth-rate-limit");
const { login, logout, refresh, register } = require("./auth.controller");
const { loginSchema, logoutSchema, refreshSchema, registerSchema } = require("./auth.validators");

const authRouter = express.Router();

authRouter.post("/register", authRateLimit, validate({ body: registerSchema }), register);
authRouter.post("/login", authRateLimit, validate({ body: loginSchema }), login);
authRouter.post("/refresh", authRateLimit, validate({ body: refreshSchema }), refresh);
authRouter.post("/logout", validate({ body: logoutSchema }), logout);

module.exports = { authRouter };
