const { createAiPlanningService } = require("./ai-planning.service");
const { createMockDb } = require("../../test-utils/mock-sequelize-db");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TRIP_ID = "22222222-2222-4222-8222-222222222222";
const DESTINATION_ID = "33333333-3333-4333-8333-333333333333";
const CULTURE_ID = "44444444-4444-4444-8444-444444444444";
const FOOD_ID = "55555555-5555-4555-8555-555555555555";
const TEMPLE_ATTRACTION_ID = "66666666-6666-4666-8666-666666666666";
const FOOD_ATTRACTION_ID = "77777777-7777-4777-8777-777777777777";
const VIEW_ATTRACTION_ID = "88888888-8888-4888-8888-888888888888";
const PARK_ATTRACTION_ID = "99999999-9999-4999-8999-999999999997";

const alwaysOpen = {
  monday: [{ open: "08:00", close: "18:00" }],
  tuesday: [{ open: "08:00", close: "18:00" }],
  wednesday: [{ open: "08:00", close: "18:00" }],
  thursday: [{ open: "08:00", close: "18:00" }],
  friday: [{ open: "08:00", close: "18:00" }],
  saturday: [{ open: "08:00", close: "18:00" }],
  sunday: [{ open: "08:00", close: "18:00" }],
};

const baseAttractions = [
  {
    id: TEMPLE_ATTRACTION_ID,
    destinationId: DESTINATION_ID,
    name: "Temple Complex",
    slug: "temple-complex",
    estimatedDurationMinutes: 120,
    rating: 4.8,
    openingHours: alwaysOpen,
    thumbnailImageUrl: null,
    mainImageUrl: null,
    isActive: true,
  },
  {
    id: FOOD_ATTRACTION_ID,
    destinationId: DESTINATION_ID,
    name: "Food Street",
    slug: "food-street",
    estimatedDurationMinutes: 90,
    rating: 4.7,
    openingHours: alwaysOpen,
    thumbnailImageUrl: null,
    mainImageUrl: null,
    isActive: true,
  },
  {
    id: VIEW_ATTRACTION_ID,
    destinationId: DESTINATION_ID,
    name: "Scenic Viewpoint",
    slug: "scenic-viewpoint",
    estimatedDurationMinutes: 60,
    rating: 4.5,
    openingHours: alwaysOpen,
    thumbnailImageUrl: null,
    mainImageUrl: null,
    isActive: true,
  },
  {
    id: PARK_ATTRACTION_ID,
    destinationId: DESTINATION_ID,
    name: "Botanical Park",
    slug: "botanical-park",
    estimatedDurationMinutes: 75,
    rating: 4.4,
    openingHours: alwaysOpen,
    thumbnailImageUrl: null,
    mainImageUrl: null,
    isActive: true,
  },
];

const createService = ({
  planningMode = "ai_assisted",
  planningProvider,
  tripOverrides = {},
  attractionsOverride,
} = {}) => {
  const attractions = attractionsOverride || baseAttractions;
  const db = createMockDb({
    trips: [
      {
        id: TRIP_ID,
        userId: USER_ID,
        destinationId: DESTINATION_ID,
        planningMode,
        startDate: "2026-04-01",
        endDate: "2026-04-01",
        ...tripOverrides,
      },
    ],
    preferenceCategories: [
      {
        id: CULTURE_ID,
        name: "Culture & Heritage",
        slug: "culture",
        description: "Historic attractions.",
        sortOrder: 1,
        isActive: true,
      },
      {
        id: FOOD_ID,
        name: "Food Hunting",
        slug: "food",
        description: "Culinary spots.",
        sortOrder: 2,
        isActive: true,
      },
    ],
    tripPreferenceCategories: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        tripId: TRIP_ID,
        preferenceCategoryId: CULTURE_ID,
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        tripId: TRIP_ID,
        preferenceCategoryId: FOOD_ID,
      },
    ],
    attractions,
    attractionCategories: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Temple",
        slug: "temple",
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        name: "Culinary Spot",
        slug: "culinary",
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        name: "Viewpoint",
        slug: "viewpoint",
      },
    ],
    attractionCategoryMappings: [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        attractionId: TEMPLE_ATTRACTION_ID,
        attractionCategoryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
      {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        attractionId: FOOD_ATTRACTION_ID,
        attractionCategoryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      {
        id: "12121212-1212-4212-8212-121212121212",
        attractionId: VIEW_ATTRACTION_ID,
        attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      },
      {
        id: "13131313-1313-4313-8313-131313131313",
        attractionId: PARK_ATTRACTION_ID,
        attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      },
    ],
  });

  return createAiPlanningService({
    dbProvider: () => db,
    ...(planningProvider ? { planningProvider } : {}),
  });
};

describe("aiPlanningService", () => {
  test("generates a deterministic preview from curated attractions only", async () => {
    const service = createService();

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.tripId).toBe(TRIP_ID);
    expect(preview.days).toHaveLength(1);
    expect(preview.strategy.mode).toBe("deterministic_only");
    expect(preview.isPartial).toBe(false);
    expect(preview.coverage.availableAttractionCount).toBe(4);
    expect(preview.coverage.requestedItemSlots).toBe(4);
    expect(preview.warnings).toHaveLength(0);

    const attractionIds = preview.days.flatMap((day) =>
      day.items.map((item) => item.attractionId)
    );

    expect(new Set(attractionIds).size).toBe(attractionIds.length);
    expect(preview.days[0].items[0].attractionId).toBe(TEMPLE_ATTRACTION_ID);
    expect(preview.days[0].items[0].source).toBe("ai_assisted");
    expect(preview.days[0].isPartial).toBe(false);
  });

  test("rejects AI preview generation for manual trips", async () => {
    const service = createService({ planningMode: "manual" });

    await expect(service.generatePreview(USER_ID, TRIP_ID)).rejects.toEqual(
      expect.objectContaining({
        message: "AI itinerary preview is only available for ai_assisted trips.",
        statusCode: 409,
      })
    );
  });

  test("supports provider-assisted reranking while discarding unknown attraction ids", async () => {
    const service = createService({
      planningProvider: {
        name: "hugging-face",
        async rankCandidates() {
          return {
            rankedAttractionIds: [
              "99999999-9999-4999-8999-999999999998",
              FOOD_ATTRACTION_ID,
              TEMPLE_ATTRACTION_ID,
              VIEW_ATTRACTION_ID,
            ],
            explanation:
              "Provider reranked known candidates to emphasize culinary stops first.",
          };
        },
      },
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.strategy.mode).toBe("deterministic_plus_provider");
    expect(preview.strategy.provider).toBe("hugging-face");
    expect(preview.strategy.reasoning).toBe(
      "Provider reranked known candidates to emphasize culinary stops first."
    );
    expect(preview.days[0].items[0].attractionId).toBe(FOOD_ATTRACTION_ID);

    const attractionIds = preview.days.flatMap((day) =>
      day.items.map((item) => item.attractionId)
    );

    expect(attractionIds).not.toContain(
      "99999999-9999-4999-8999-999999999998"
    );
  });

  test("returns partial previews with explicit warnings when curated attractions are insufficient", async () => {
    const service = createService({
      tripOverrides: {
        endDate: "2026-04-03",
      },
      attractionsOverride: baseAttractions.slice(0, 2),
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.isPartial).toBe(true);
    expect(preview.coverage.requestedDayCount).toBe(3);
    expect(preview.coverage.availableAttractionCount).toBe(2);
    expect(preview.coverage.scheduledItemCount).toBe(2);
    expect(preview.warnings.join(" ")).toContain(
      "Only 2 curated attractions were available"
    );
    expect(preview.days).toHaveLength(3);
    expect(preview.days[0].items).not.toHaveLength(0);
    expect(preview.days[2].items).toHaveLength(0);
    expect(preview.days[2].isPartial).toBe(true);
  });
});
