const {
  buildPaginationQuerySchema,
  idOrSlugParamSchema,
} = require("../../validators/common");

module.exports = {
  destinationDetailParamsSchema: idOrSlugParamSchema,
  listDestinationsQuerySchema: buildPaginationQuerySchema({
    defaultLimit: 20,
    maxLimit: 100,
  }),
};
