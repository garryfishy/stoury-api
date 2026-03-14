process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.AI_PLANNING_PROVIDER = "deterministic";

const { createAiPlanningService } = require("../src/modules/ai-planning/ai-planning.service");

const trip = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: "11111111-1111-4111-8111-111111111111",
  destinationId: "22222222-2222-4222-8222-222222222222",
  planningMode: "ai_assisted",
  startDate: "2026-04-10",
  endDate: "2026-04-11",
};

const attractions = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    destinationId: trip.destinationId,
    name: "Pantai Nongsa",
    slug: "pantai-nongsa",
    fullAddress: "Nongsa, Batam, Kepulauan Riau, Indonesia",
    latitude: "1.1870000",
    longitude: "104.1190000",
    estimatedDurationMinutes: 120,
    rating: "4.5",
    openingHours: {
      friday: [{ open: "08:00", close: "18:00" }],
      saturday: [{ open: "08:00", close: "18:00" }],
    },
    thumbnailImageUrl: null,
    mainImageUrl: null,
    externalSource: "google_places",
    externalPlaceId: "ChIJexamplePantaiNongsa",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    destinationId: trip.destinationId,
    name: "Mega Wisata Ocarina",
    slug: "mega-wisata-ocarina",
    fullAddress: "Sadai, Bengkong, Batam, Kepulauan Riau, Indonesia",
    latitude: "1.1565000",
    longitude: "104.0443000",
    estimatedDurationMinutes: 150,
    rating: "4.3",
    openingHours: {
      friday: [{ open: "08:00", close: "18:00" }],
      saturday: [{ open: "08:00", close: "18:00" }],
    },
    thumbnailImageUrl: null,
    mainImageUrl: null,
    externalSource: null,
    externalPlaceId: null,
  },
];

describe("ai planning service", () => {
  const expectBudgetEstimateShape = (item) => {
    expect(item).toHaveProperty("estimatedBudgetMin");
    expect(item).toHaveProperty("estimatedBudgetMax");
    expect(item).toHaveProperty("estimatedBudgetNote");

    if (item.estimatedBudgetMin === null) {
      expect(item.estimatedBudgetMax).toBeNull();
      expect(item.estimatedBudgetNote).toBeNull();
      return;
    }

    expect(item.estimatedBudgetMin).toEqual(expect.any(Number));
    expect(item.estimatedBudgetMax).toEqual(expect.any(Number));
    expect(item.estimatedBudgetMax).toBeGreaterThanOrEqual(item.estimatedBudgetMin);
    expect(item.estimatedBudgetNote).toEqual(expect.any(String));
  };

  test("generatePreview returns a deterministic preview for ai_assisted trips", async () => {
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue(trip),
      },
      TripPreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([
          {
            tripId: trip.id,
            preferenceCategoryId: "55555555-5555-4555-8555-555555555555",
          },
        ]),
      },
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([
          {
            id: "55555555-5555-4555-8555-555555555555",
            name: "Food",
            slug: "food",
            description: "Food hunting",
          },
        ]),
      },
      Attraction: {
        findAll: jest.fn().mockResolvedValue(attractions),
      },
      AttractionCategoryMapping: {
        findAll: jest.fn().mockResolvedValue([
          {
            attractionId: attractions[0].id,
            attractionCategoryId: "77777777-7777-4777-8777-777777777777",
          },
          {
            attractionId: attractions[1].id,
            attractionCategoryId: "77777777-7777-4777-8777-777777777777",
          },
        ]),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([
          {
            id: "77777777-7777-4777-8777-777777777777",
            name: "Culinary Spot",
            slug: "culinary",
          },
        ]),
      },
    };
    const aiPlanningService = createAiPlanningService({
      dbProvider: () => db,
    });

    const result = await aiPlanningService.generatePreview(trip.userId, trip.id);

    expect(result.tripId).toBe(trip.id);
    expect(result.planningMode).toBe("ai_assisted");
    expect(result.preferences).toEqual([
      expect.objectContaining({
        slug: "food",
        name: "Makanan",
      }),
    ]);
    expect(result.days).toHaveLength(2);
    expect(result.days[0].items[0]).toEqual(
      expect.objectContaining({
        source: "ai_assisted",
        attractionId: expect.any(String),
        attraction: expect.objectContaining({
          fullAddress: expect.any(String),
          latitude: expect.any(String),
          longitude: expect.any(String),
          thumbnailImageUrl: expect.stringContaining("/api/attractions/"),
          mainImageUrl: expect.stringContaining("/api/attractions/"),
          enrichment: expect.any(Object),
        }),
      })
    );
    result.days.forEach((day) => {
      day.items.forEach(expectBudgetEstimateShape);
    });
    expect(result.days[0].items[0].attraction.enrichment).toHaveProperty("externalSource");
    expect(result.days[0].items[0].attraction.enrichment).toHaveProperty("externalPlaceId");
    expect(result.days[0].items[0].attraction).toEqual(
      expect.objectContaining({
        openingHours: expect.objectContaining({
          friday: [{ open: "08:00", close: "18:00" }],
          saturday: [{ open: "08:00", close: "18:00" }],
        }),
        tripDayOpeningHours: [{ open: "08:00", close: "18:00" }],
        tripDayIsOpen: true,
      })
    );
    expect(result.strategy).toEqual({
      mode: "deterministic_only",
      provider: "deterministic",
      usedProviderRanking: false,
      reasoning:
        "MVP generation uses deterministic scheduling over curated DB attractions. Providers may rerank known candidates later but cannot introduce new attractions.",
    });
  });

  test("generatePreview rejects non-ai-assisted trips", async () => {
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue({
          ...trip,
          planningMode: "manual",
        }),
      },
      Attraction: {
        findAll: jest.fn(),
      },
      TripPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const aiPlanningService = createAiPlanningService({
      dbProvider: () => db,
    });

    await expect(aiPlanningService.generatePreview(trip.userId, trip.id)).rejects.toMatchObject(
      {
        message: "AI itinerary preview is only available for ai_assisted trips.",
        statusCode: 409,
      }
    );
  });
});
