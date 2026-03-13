const { z } = require("zod");
const { dateOnlySchema, tripIdParamSchema, uuidSchema } = require("../../validators/common");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:MM 24-hour format.");

const nullableBudgetIntegerSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return null;
    }

    return typeof value === "string" ? Number(value) : value;
  },
  z.number().int().nonnegative().nullable()
);

const itineraryItemInputSchema = z
  .object({
    attractionId: uuidSchema,
    orderIndex: z.coerce.number().int().positive().optional(),
    startTime: timeSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    estimatedBudgetMin: nullableBudgetIntegerSchema.optional(),
    estimatedBudgetMax: nullableBudgetIntegerSchema.optional(),
    estimatedBudgetNote: z.string().trim().max(500).nullable().optional(),
    source: z.enum(["manual", "ai_assisted"]).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.startTime &&
      value.endTime &&
      value.startTime >= value.endTime
    ) {
      context.addIssue({
        code: "custom",
        message: "startTime must be before endTime.",
        path: ["startTime"],
      });
    }

    if (
      value.estimatedBudgetMin !== null &&
      value.estimatedBudgetMin !== undefined &&
      value.estimatedBudgetMax !== null &&
      value.estimatedBudgetMax !== undefined &&
      value.estimatedBudgetMax < value.estimatedBudgetMin
    ) {
      context.addIssue({
        code: "custom",
        message:
          "estimatedBudgetMax must be greater than or equal to estimatedBudgetMin.",
        path: ["estimatedBudgetMax"],
      });
    }
  });

const itineraryDayInputSchema = z.object({
  dayNumber: z.coerce.number().int().positive(),
  date: dateOnlySchema.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(itineraryItemInputSchema).max(12),
});

const saveItinerarySchema = z.object({
  days: z.array(itineraryDayInputSchema).min(1).max(30),
});

const itineraryCategoryResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
});

const numericLikeSchema = z.union([z.number(), z.string()]);

const attractionSummaryResponseSchema = z.object({
  id: uuidSchema,
  destinationId: uuidSchema,
  name: z.string(),
  slug: z.string(),
  fullAddress: z.string().nullable(),
  latitude: numericLikeSchema.nullable(),
  longitude: numericLikeSchema.nullable(),
  estimatedDurationMinutes: z.number().int().positive().nullable(),
  rating: numericLikeSchema.nullable(),
  thumbnailImageUrl: z.string().nullable(),
  mainImageUrl: z.string().nullable(),
  enrichment: z.object({
    externalSource: z.string().nullable(),
    externalPlaceId: z.string().nullable(),
  }),
  categories: z.array(itineraryCategoryResponseSchema),
});

const itineraryItemResponseSchema = z.object({
  id: uuidSchema.optional(),
  attractionId: uuidSchema,
  attractionName: z.string(),
  startTime: timeSchema.nullable(),
  endTime: timeSchema.nullable(),
  orderIndex: z.number().int().positive(),
  notes: z.string().nullable(),
  estimatedBudgetMin: z.number().int().nonnegative().nullable(),
  estimatedBudgetMax: z.number().int().nonnegative().nullable(),
  estimatedBudgetNote: z.string().nullable(),
  source: z.enum(["manual", "ai_assisted"]),
  attraction: attractionSummaryResponseSchema.nullable(),
});

const itineraryDayResponseSchema = z.object({
  id: uuidSchema.optional(),
  dayNumber: z.number().int().positive(),
  date: dateOnlySchema.nullable(),
  notes: z.string().nullable(),
  items: z.array(itineraryItemResponseSchema),
});

const itineraryResponseSchema = z.object({
  itineraryId: uuidSchema.nullable(),
  tripId: uuidSchema,
  destinationId: uuidSchema,
  planningMode: z.enum(["manual", "ai_assisted"]),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  hasItinerary: z.boolean(),
  days: z.array(itineraryDayResponseSchema),
});

module.exports = {
  itineraryDayResponseSchema,
  itineraryItemResponseSchema,
  itineraryResponseSchema,
  saveItinerarySchema,
  timeSchema,
  tripItineraryParamsSchema: tripIdParamSchema,
};
