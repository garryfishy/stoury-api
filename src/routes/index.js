const express = require("express");
const { authRouter } = require("../modules/auth/auth.routes");
const { usersRouter } = require("../modules/users/users.routes");
const { preferencesRouter } = require("../modules/preferences/preferences.routes");
const { destinationsRouter } = require("../modules/destinations/destinations.routes");
const { attractionsRouter } = require("../modules/attractions/attractions.routes");
const { adminAttractionsRouter } = require("../modules/admin-attractions/admin-attractions.routes");
const { tripsRouter } = require("../modules/trips/trips.routes");
const { itinerariesRouter } = require("../modules/itineraries/itineraries.routes");
const { aiPlanningRouter } = require("../modules/ai-planning/ai-planning.routes");

const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/preferences", preferencesRouter);
apiRouter.use("/destinations", destinationsRouter);
apiRouter.use("/", attractionsRouter);
apiRouter.use("/admin", adminAttractionsRouter);
apiRouter.use("/trips", tripsRouter);
apiRouter.use("/trips", aiPlanningRouter);
apiRouter.use("/trips", itinerariesRouter);

module.exports = { apiRouter };
