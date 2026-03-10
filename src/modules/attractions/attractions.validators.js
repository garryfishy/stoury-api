const { z } = require("zod");
const {
  buildPaginationQuerySchema,
  destinationIdParamSchema,
  idOrSlugParamSchema,
  optionalUuidArrayQuery,
} = require("../../validators/common");

const listAttractionsQuerySchema = buildPaginationQuerySchema({
  defaultLimit: 12,
  maxLimit: 100,
}).extend({
  categoryIds: optionalUuidArrayQuery,
});

module.exports = {
  attractionDetailParamsSchema: idOrSlugParamSchema,
  destinationAttractionsParamsSchema: destinationIdParamSchema,
  listAttractionsQuerySchema,
};
