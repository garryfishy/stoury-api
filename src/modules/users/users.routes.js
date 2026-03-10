const express = require("express");
const { authenticate } = require("../../middlewares/authenticate");
const { validate } = require("../../middlewares/validate");
const { getMe, updateMe } = require("./users.controller");
const { updateProfileSchema } = require("./users.validators");

const usersRouter = express.Router();

usersRouter.use(authenticate);
usersRouter.get("/me", getMe);
usersRouter.patch("/me", validate({ body: updateProfileSchema }), updateMe);

module.exports = { usersRouter };
