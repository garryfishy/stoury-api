const express = require("express");
const {
  ensureAdminEnrichmentAvailable,
} = require("../../middlewares/admin-enrichment-availability");
const {
  adminEnrichmentBatchRateLimit,
  adminEnrichmentReadRateLimit,
} = require("../../middlewares/admin-enrichment-rate-limit");
const { authenticate } = require("../../middlewares/authenticate");
const { authorize } = require("../../middlewares/authorize");
const { validate } = require("../../middlewares/validate");
const {
  backfillAttractionPhotos,
  enrichAttraction,
  enrichMissingAttractions,
  listPendingEnrichment,
} = require("./admin-attractions.controller");
const {
  attractionIdParamSchema,
  batchEnrichmentRequestSchema,
  photoBackfillRequestSchema,
  pendingAttractionsQuerySchema,
} = require("./admin-attractions.validators");

const adminAttractionsRouter = express.Router();

adminAttractionsRouter.use(authenticate);
adminAttractionsRouter.use(authorize("admin"));
adminAttractionsRouter.use(ensureAdminEnrichmentAvailable);
adminAttractionsRouter.get(
  "/attractions/enrichment-pending",
  adminEnrichmentReadRateLimit,
  validate({ query: pendingAttractionsQuerySchema }),
  listPendingEnrichment
);
adminAttractionsRouter.post(
  "/attractions/:attractionId/enrich",
  adminEnrichmentReadRateLimit,
  validate({ params: attractionIdParamSchema }),
  enrichAttraction
);
adminAttractionsRouter.post(
  "/attractions/enrich-missing",
  adminEnrichmentBatchRateLimit,
  validate({ body: batchEnrichmentRequestSchema }),
  enrichMissingAttractions
);
adminAttractionsRouter.post(
  "/attractions/backfill-photos",
  adminEnrichmentBatchRateLimit,
  validate({ body: photoBackfillRequestSchema }),
  backfillAttractionPhotos
);

module.exports = { adminAttractionsRouter };
