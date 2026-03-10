const { z } = require("zod");
const { parseDateOnly } = require("../utils/date");

const uuidSchema = z.string().uuid();

const idOrSlugParamSchema = z.object({
  idOrSlug: z.string().trim().min(1),
});

const destinationIdParamSchema = z.object({
  destinationId: uuidSchema,
});

const tripIdParamSchema = z.object({
  tripId: uuidSchema,
});

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => Boolean(parseDateOnly(value)), "Invalid calendar date.");

const optionalUuidArrayQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}, z.array(uuidSchema).optional());

const buildPaginationQuerySchema = ({ defaultLimit = 20, maxLimit = 100 } = {}) =>
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(maxLimit).default(defaultLimit),
  });

module.exports = {
  buildPaginationQuerySchema,
  dateOnlySchema,
  destinationIdParamSchema,
  idOrSlugParamSchema,
  optionalUuidArrayQuery,
  tripIdParamSchema,
  uuidSchema,
};
