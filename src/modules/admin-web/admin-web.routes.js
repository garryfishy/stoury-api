const express = require("express");
const {
  handleAdminWebError,
  handleLogin,
  handleLogout,
  renderAdminNotFound,
  renderDashboard,
  renderDestinationsPage,
  renderLoginPage,
  renderPendingEnrichmentShell,
  runDestinationEnrichment,
  runDestinationPhotoBackfill,
  updateDestinationState,
} = require("./admin-web.controller");
const { adminLoginRateLimit } = require("./admin-web.rate-limit");
const {
  redirectAuthenticatedAdmin,
  requireAdminPageAuth,
} = require("./admin-web.middleware");

const adminWebRouter = express.Router();

adminWebRouter.use(express.urlencoded({ extended: false }));

adminWebRouter.get("/login", redirectAuthenticatedAdmin, renderLoginPage);
adminWebRouter.post("/login", adminLoginRateLimit, redirectAuthenticatedAdmin, handleLogin);
adminWebRouter.post("/logout", handleLogout);

adminWebRouter.use(requireAdminPageAuth);
adminWebRouter.get("/", renderDashboard);
adminWebRouter.get("/destinations", renderDestinationsPage);
adminWebRouter.post("/destinations/:destinationId/state", updateDestinationState);
adminWebRouter.post("/destinations/:destinationId/enrich", runDestinationEnrichment);
adminWebRouter.post(
  "/destinations/:destinationId/backfill-photos",
  runDestinationPhotoBackfill
);
adminWebRouter.get("/enrichment/pending", renderPendingEnrichmentShell);
adminWebRouter.use(renderAdminNotFound);
adminWebRouter.use(handleAdminWebError);

module.exports = {
  adminWebRouter,
};
