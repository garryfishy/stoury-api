const express = require("express");
const multer = require("multer");
const {
  handleAdminWebError,
  handleLogin,
  handleLogout,
  renderAdminNotFound,
  renderAttractionAssetsPage,
  renderDashboard,
  renderDestinationsPage,
  renderLoginPage,
  renderPendingEnrichmentShell,
  renderPendingReviewPage,
  resolvePendingReview,
  rejectPendingReview,
  runPendingAttractionEnrichment,
  runPendingAttractionPhotoBackfill,
  runPendingBatchEnrichment,
  runPendingBatchPhotoBackfill,
  runDestinationEnrichment,
  runDestinationPhotoBackfill,
  uploadAttractionAssets,
  updateDestinationState,
} = require("./admin-web.controller");
const { adminLoginRateLimit } = require("./admin-web.rate-limit");
const {
  redirectAuthenticatedAdmin,
  requireAdminPageAuth,
} = require("./admin-web.middleware");

const adminWebRouter = express.Router();
const upload = multer({
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 2,
  },
  storage: multer.memoryStorage(),
});

adminWebRouter.use(express.urlencoded({ extended: false }));

adminWebRouter.get("/login", redirectAuthenticatedAdmin, renderLoginPage);
adminWebRouter.post("/login", adminLoginRateLimit, redirectAuthenticatedAdmin, handleLogin);
adminWebRouter.post("/logout", handleLogout);

adminWebRouter.use(requireAdminPageAuth);
adminWebRouter.get("/", renderDashboard);
adminWebRouter.get("/destinations", renderDestinationsPage);
adminWebRouter.get("/attraction-assets", renderAttractionAssetsPage);
adminWebRouter.post("/destinations/:destinationId/state", updateDestinationState);
adminWebRouter.post("/destinations/:destinationId/enrich", runDestinationEnrichment);
adminWebRouter.post(
  "/destinations/:destinationId/backfill-photos",
  runDestinationPhotoBackfill
);
adminWebRouter.post(
  "/attraction-assets/:attractionId/upload",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "thumbnailImage", maxCount: 1 },
  ]),
  uploadAttractionAssets
);
adminWebRouter.get("/enrichment/pending", renderPendingEnrichmentShell);
adminWebRouter.get("/enrichment/:attractionId/review", renderPendingReviewPage);
adminWebRouter.post("/enrichment/pending/batch", runPendingBatchEnrichment);
adminWebRouter.post("/enrichment/pending/photos/batch", runPendingBatchPhotoBackfill);
adminWebRouter.post("/enrichment/:attractionId/enrich", runPendingAttractionEnrichment);
adminWebRouter.post(
  "/enrichment/:attractionId/backfill-photos",
  runPendingAttractionPhotoBackfill
);
adminWebRouter.post("/enrichment/:attractionId/review/resolve", resolvePendingReview);
adminWebRouter.post("/enrichment/:attractionId/review/reject", rejectPendingReview);
adminWebRouter.use(renderAdminNotFound);
adminWebRouter.use(handleAdminWebError);

module.exports = {
  adminWebRouter,
};
