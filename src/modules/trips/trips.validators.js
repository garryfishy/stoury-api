const { z } = require("zod");
const {
  dateOnlySchema,
  tripIdParamSchema,
  uuidSchema,
} = require("../../validators/common");

const planningModeSchema = z.enum(["manual", "ai_assisted"]);
const preferenceSourceSchema = z.enum(["profile", "custom"]);

const createTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destinationId: uuidSchema,
    planningMode: planningModeSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    budget: z.coerce.number().nonnegative(),
    preferenceSource: preferenceSourceSchema,
    preferenceCategoryIds: z
      .array(uuidSchema)
      .max(50)
      .refine((value) => new Set(value).size === value.length, "preferenceCategoryIds must be unique.")
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.startDate > value.endDate) {
      context.addIssue({
        code: "custom",
        message: "startDate must be on or before endDate.",
        path: ["startDate"],
      });
    }

    if (value.preferenceSource === "custom" && !Array.isArray(value.preferenceCategoryIds)) {
      context.addIssue({
        code: "custom",
        message: "preferenceCategoryIds is required when preferenceSource is custom.",
        path: ["preferenceCategoryIds"],
      });
    }
  });

const updateTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    destinationId: uuidSchema.optional(),
    planningMode: planningModeSchema.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    budget: z.coerce.number().nonnegative().optional(),
    preferenceSource: preferenceSourceSchema.optional(),
    preferenceCategoryIds: z
      .array(uuidSchema)
      .max(50)
      .refine((value) => new Set(value).size === value.length, "preferenceCategoryIds must be unique.")
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.")
  .superRefine((value, context) => {
    if (
      value.startDate &&
      value.endDate &&
      value.startDate > value.endDate
    ) {
      context.addIssue({
        code: "custom",
        message: "startDate must be on or before endDate.",
        path: ["startDate"],
      });
    }

    if (value.preferenceSource === "custom" && !Array.isArray(value.preferenceCategoryIds)) {
      context.addIssue({
        code: "custom",
        message: "preferenceCategoryIds is required when preferenceSource is custom.",
        path: ["preferenceCategoryIds"],
      });
    }
  });

module.exports = {
  createTripSchema,
  tripParamsSchema: tripIdParamSchema,
  updateTripSchema,
};
