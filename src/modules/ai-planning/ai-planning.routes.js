const express = require("express");
const { authenticate } = require("../../middlewares/authenticate");
const { validate } = require("../../middlewares/validate");
const { generateAiTripPreview } = require("./ai-planning.controller");
const { tripAiGenerateParamsSchema } = require("./ai-planning.validators");

const aiPlanningRouter = express.Router();

aiPlanningRouter.use(authenticate);
aiPlanningRouter.post(
  "/:tripId/ai-generate",
  validate({ params: tripAiGenerateParamsSchema }),
  generateAiTripPreview
);

module.exports = { aiPlanningRouter };
