const { z } = require("zod");
const { destinationIdParamSchema, uuidSchema } = require("../../validators/common");
const {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_PENDING_LIMIT,
  DEFAULT_STALE_DAYS,
  ENRICHMENT_STATUSES,
  MAX_BATCH_LIMIT,
  MAX_PENDING_LIMIT,
} = require("./admin-attractions.helpers");

const coerceBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
};

const attractionIdParamSchema = z.object({
  attractionId: uuidSchema,
});

const enrichmentStatusSchema = z.enum(ENRICHMENT_STATUSES);

const pendingAttractionsQuerySchema = z.object({
  destinationId: destinationIdParamSchema.shape.destinationId.optional(),
  status: enrichmentStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PENDING_LIMIT).default(DEFAULT_PENDING_LIMIT),
  staleOnly: z.preprocess(coerceBoolean, z.boolean().default(false)),
  staleDays: z.coerce.number().int().positive().max(365).default(DEFAULT_STALE_DAYS),
});

const batchEnrichmentRequestSchema = z.object({
  destinationId: destinationIdParamSchema.shape.destinationId.optional(),
  limit: z.coerce.number().int().positive().max(MAX_BATCH_LIMIT).default(DEFAULT_BATCH_LIMIT),
  dryRun: z.preprocess(coerceBoolean, z.boolean().default(false)),
  staleOnly: z.preprocess(coerceBoolean, z.boolean().default(false)),
  staleDays: z.coerce.number().int().positive().max(365).default(DEFAULT_STALE_DAYS),
});

const photoBackfillRequestSchema = z.object({
  destinationId: destinationIdParamSchema.shape.destinationId.optional(),
  limit: z.coerce.number().int().positive().max(MAX_BATCH_LIMIT).default(DEFAULT_BATCH_LIMIT),
  dryRun: z.preprocess(coerceBoolean, z.boolean().default(false)),
  force: z.preprocess(coerceBoolean, z.boolean().default(false)),
});

module.exports = {
  attractionIdParamSchema,
  batchEnrichmentRequestSchema,
  enrichmentStatusSchema,
  photoBackfillRequestSchema,
  pendingAttractionsQuerySchema,
};
