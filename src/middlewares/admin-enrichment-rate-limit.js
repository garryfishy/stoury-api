const { ipKeyGenerator, rateLimit } = require("express-rate-limit");
const env = require("../config/env");

const buildEnvelope = (message) => ({
  success: false,
  message,
  data: null,
});

const buildRateLimitKey = (req) => req.auth?.userId || ipKeyGenerator(req.ip);

const adminEnrichmentReadRateLimit = rateLimit({
  windowMs: env.ADMIN_ENRICHMENT_RATE_LIMIT_WINDOW_MS,
  max: env.ADMIN_ENRICHMENT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildRateLimitKey,
  message: buildEnvelope(
    "Too many admin enrichment requests. Please try again later."
  ),
});

const adminEnrichmentBatchRateLimit = rateLimit({
  windowMs: env.ADMIN_ENRICHMENT_RATE_LIMIT_WINDOW_MS,
  max: env.ADMIN_ENRICHMENT_BATCH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildRateLimitKey,
  message: buildEnvelope(
    "Too many admin batch enrichment requests. Please try again later."
  ),
});

module.exports = {
  adminEnrichmentBatchRateLimit,
  adminEnrichmentReadRateLimit,
};
