const express = require("express");
const { authenticate } = require("../../middlewares/authenticate");
const { validate } = require("../../middlewares/validate");
const { getMine, replaceMine } = require("./preferences.controller");
const { replacePreferencesSchema } = require("./preferences.validators");

const preferencesRouter = express.Router();

preferencesRouter.use(authenticate);
preferencesRouter.get("/me", getMine);
preferencesRouter.put("/me", validate({ body: replacePreferencesSchema }), replaceMine);

module.exports = { preferencesRouter };
