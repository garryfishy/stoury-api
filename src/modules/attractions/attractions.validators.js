const { z } = require("zod");
const {
  destinationIdParamSchema,
  idOrSlugParamSchema,
  optionalUuidArrayQuery,
} = require("../../validators/common");

const listAttractionsQuerySchema = z.object({
  categoryIds: optionalUuidArrayQuery,
});

module.exports = {
  attractionDetailParamsSchema: idOrSlugParamSchema,
  destinationAttractionsParamsSchema: destinationIdParamSchema,
  listAttractionsQuerySchema,
};
