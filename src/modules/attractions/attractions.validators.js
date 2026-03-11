const { z } = require("zod");
const {
  buildPaginationQuerySchema,
  idOrSlugParamSchema,
  optionalUuidArrayQuery,
} = require("../../validators/common");

const destinationAttractionsParamsSchema = z.object({
  destinationId: z.string().trim().min(1),
});

const optionalSearchQuery = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized ? normalized : undefined;
}, z.string().min(1).max(100).optional());

const listAttractionsQuerySchema = buildPaginationQuerySchema({
  defaultLimit: 12,
  maxLimit: 100,
}).extend({
  categoryIds: optionalUuidArrayQuery,
  q: optionalSearchQuery,
});

module.exports = {
  attractionDetailParamsSchema: idOrSlugParamSchema,
  destinationAttractionsParamsSchema,
  listAttractionsQuerySchema,
};
