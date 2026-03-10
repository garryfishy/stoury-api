const { z } = require("zod");
const {
  itineraryDayResponseSchema,
  itineraryItemResponseSchema,
} = require("../itineraries/itineraries.validators");
const { dateOnlySchema, tripIdParamSchema, uuidSchema } = require("../../validators/common");

const aiPlanningStrategySchema = z.object({
  mode: z.enum(["deterministic_only", "deterministic_plus_provider"]),
  provider: z.string().min(1),
  usedProviderRanking: z.boolean(),
  reasoning: z.string().min(1),
});

const previewDaySchema = itineraryDayResponseSchema
  .omit({ id: true })
  .extend({
    isPartial: z.boolean(),
    items: z.array(itineraryItemResponseSchema.omit({ id: true })),
  });

const previewPreferenceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string(),
});

const aiPlanningCoverageSchema = z.object({
  requestedDayCount: z.number().int().positive(),
  generatedDayCount: z.number().int().nonnegative(),
  availableAttractionCount: z.number().int().nonnegative(),
  requestedItemSlots: z.number().int().positive(),
  scheduledItemCount: z.number().int().nonnegative(),
  maxItemsPerDay: z.number().int().positive(),
});

const aiPlanningPreviewSchema = z.object({
  tripId: uuidSchema,
  destinationId: uuidSchema,
  planningMode: z.enum(["manual", "ai_assisted"]),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  generatedAt: z.string().datetime({ offset: true }),
  preferences: z.array(previewPreferenceSchema),
  strategy: aiPlanningStrategySchema,
  isPartial: z.boolean(),
  coverage: aiPlanningCoverageSchema,
  warnings: z.array(z.string()),
  days: z.array(previewDaySchema),
});

module.exports = {
  aiPlanningPreviewSchema,
  tripAiGenerateParamsSchema: tripIdParamSchema,
};
