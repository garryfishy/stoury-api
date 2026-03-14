process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.AI_PLANNING_PROVIDER = "deterministic";

const { createAiPlanningService } = require("./ai-planning.service");
const {
  createHuggingFacePlanningProvider,
} = require("./ai-planning.providers");
const { createMockDb } = require("../../test-utils/mock-sequelize-db");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TRIP_ID = "22222222-2222-4222-8222-222222222222";
const DESTINATION_ID = "33333333-3333-4333-8333-333333333333";
const HISTORY_ID = "44444444-4444-4444-8444-444444444444";
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

const eveningOpen = {
  monday: [{ open: "10:00", close: "22:00" }],
  tuesday: [{ open: "10:00", close: "22:00" }],
  wednesday: [{ open: "10:00", close: "22:00" }],
  thursday: [{ open: "10:00", close: "22:00" }],
  friday: [{ open: "10:00", close: "22:00" }],
  saturday: [{ open: "10:00", close: "22:00" }],
  sunday: [{ open: "10:00", close: "22:00" }],
};

const legacyAlwaysOpen = {
  sunday: ["08:00 - 18:00"],
  monday: ["08:00 - 18:00"],
  tuesday: ["08:00 - 18:00"],
  wednesday: ["08:00 - 18:00"],
  thursday: ["08:00 - 18:00"],
  friday: ["08:00 - 18:00"],
  saturday: ["08:00 - 18:00"],
};

const baseAttractions = [
  {
    id: TEMPLE_ATTRACTION_ID,
    destinationId: DESTINATION_ID,
    name: "Temple Complex",
    slug: "temple-complex",
    fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
    latitude: "1.1450",
    longitude: "104.0100",
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
    fullAddress: "Harbour Bay, Batam, Kepulauan Riau, Indonesia",
    latitude: "1.1550",
    longitude: "103.9900",
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
    fullAddress: "Batam Centre, Batam, Kepulauan Riau, Indonesia",
    latitude: "1.1300",
    longitude: "104.0550",
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
    fullAddress: "Batam Centre, Batam, Kepulauan Riau, Indonesia",
    latitude: "1.1280",
    longitude: "104.0520",
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
        budget: "2500000.00",
        ...tripOverrides,
      },
    ],
    preferenceCategories: [
      {
        id: HISTORY_ID,
        name: "History",
        slug: "history",
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
        preferenceCategoryId: HISTORY_ID,
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
    expect(preview.preferences).toEqual([
      expect.objectContaining({
        slug: "history",
        name: "Sejarah",
      }),
      expect.objectContaining({
        slug: "food",
        name: "Makanan",
      }),
    ]);
    expect(preview.strategy.mode).toBe("deterministic_only");
    expect(preview.isPartial).toBe(false);
    expect(preview.coverage.availableAttractionCount).toBe(4);
    expect(preview.coverage.requestedItemSlots).toBe(4);
    expect(preview.budget).toBe("2500000.00");
    expect(preview.budgetFit).toEqual({
      level: "comfortable",
      perDayBudget: 2500000,
      isApproximate: true,
      reasoning:
        "Budget averages about 2,500,000 per day across 1 day(s), which gives the planner comfortable room for the current curated itinerary style.",
    });
    expect(preview.budgetWarnings).toEqual([
      "Budget fit is approximate because attraction-level pricing, transport, food, and lodging costs are not stored in the current catalog yet.",
    ]);
    expect(preview.warnings).toEqual(preview.budgetWarnings);

    const attractionIds = preview.days.flatMap((day) =>
      day.items.map((item) => item.attractionId)
    );

    expect(new Set(attractionIds).size).toBe(attractionIds.length);
    expect(preview.days[0].items[0].attractionId).toBe(TEMPLE_ATTRACTION_ID);
    expect(preview.days[0].items[0]).toEqual(
      expect.objectContaining({
        source: "ai_assisted",
        estimatedBudgetMin: 0,
        estimatedBudgetMax: 60000,
        estimatedBudgetNote:
          "Heuristic only: allows for common entry, donation, or parking-style spend.",
      })
    );
    expect(preview.days[0].items[0].attraction).toEqual(
      expect.objectContaining({
        openingHours: alwaysOpen,
        tripDayOpeningHours: [{ open: "08:00", close: "18:00" }],
        tripDayIsOpen: true,
      })
    );
    expect(preview.days[0].isPartial).toBe(false);
  });

  test("normalizes legacy string opening-hours ranges in AI preview responses", async () => {
    const service = createService({
      attractionsOverride: baseAttractions.map((attraction) => ({
        ...attraction,
        openingHours: legacyAlwaysOpen,
      })),
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.days[0].items[0].attraction.openingHours).toEqual(alwaysOpen);
    expect(preview.days[0].items[0].attraction.tripDayOpeningHours).toEqual([
      { open: "08:00", close: "18:00" },
    ]);
    expect(preview.days[0].items[0].attraction.tripDayIsOpen).toBe(true);
  });

  test("passes trip budget into provider input", async () => {
    const planningProvider = {
      name: "deterministic",
      rankCandidates: jest.fn().mockResolvedValue({
        rankedAttractionIds: [
          TEMPLE_ATTRACTION_ID,
          FOOD_ATTRACTION_ID,
          VIEW_ATTRACTION_ID,
          PARK_ATTRACTION_ID,
        ],
        explanation: null,
      }),
    };
    const service = createService({
      planningProvider,
      tripOverrides: {
        endDate: "2026-04-03",
        budget: "900000.00",
      },
    });

    await service.generatePreview(USER_ID, TRIP_ID);

    expect(planningProvider.rankCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        trip: expect.objectContaining({
          tripId: TRIP_ID,
          budget: "900000.00",
          budgetPerDay: 300000,
        }),
        candidates: expect.arrayContaining([
          expect.objectContaining({
            attractionId: TEMPLE_ATTRACTION_ID,
            fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
            latitude: "1.1450",
            longitude: "104.0100",
          }),
        ]),
      })
    );
  });

  test("keeps same-day selections geographically coherent when nearby alternatives exist", async () => {
    const northHistoryId = "10101010-1010-4010-8010-101010101010";
    const southFoodId = "20202020-2020-4020-8020-202020202020";
    const northViewId = "30303030-3030-4030-8030-303030303030";
    const northParkId = "40404040-4040-4040-8040-404040404040";
    const farViewId = "50505050-5050-4050-8050-505050505050";
    const farParkId = "60606060-6060-4060-8060-606060606060";
    const northGardenId = "70707070-7070-4070-8070-707070707070";
    const farBeachId = "80808080-8080-4080-8080-808080808080";
    const customAttractions = [
      {
        id: northHistoryId,
        destinationId: DESTINATION_ID,
        name: "Old Town Temple",
        slug: "old-town-temple",
        fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
        latitude: "1.1450",
        longitude: "104.0100",
        estimatedDurationMinutes: 120,
        rating: 4.9,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: southFoodId,
        destinationId: DESTINATION_ID,
        name: "Southern Food Pier",
        slug: "southern-food-pier",
        fullAddress: "Galang, Batam, Kepulauan Riau, Indonesia",
        latitude: "0.9000",
        longitude: "104.1800",
        estimatedDurationMinutes: 90,
        rating: 4.85,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: northViewId,
        destinationId: DESTINATION_ID,
        name: "City View Deck",
        slug: "city-view-deck",
        fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
        latitude: "1.1470",
        longitude: "104.0140",
        estimatedDurationMinutes: 75,
        rating: 4.8,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: northParkId,
        destinationId: DESTINATION_ID,
        name: "Nagoya Heritage Park",
        slug: "nagoya-heritage-park",
        fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
        latitude: "1.1430",
        longitude: "104.0160",
        estimatedDurationMinutes: 75,
        rating: 4.75,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: northGardenId,
        destinationId: DESTINATION_ID,
        name: "Nagoya Botanical Garden",
        slug: "nagoya-botanical-garden",
        fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
        latitude: "1.1410",
        longitude: "104.0180",
        estimatedDurationMinutes: 75,
        rating: 4.72,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: farViewId,
        destinationId: DESTINATION_ID,
        name: "Southern Coastal View",
        slug: "southern-coastal-view",
        fullAddress: "Galang, Batam, Kepulauan Riau, Indonesia",
        latitude: "0.9050",
        longitude: "104.1850",
        estimatedDurationMinutes: 60,
        rating: 4.7,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: farParkId,
        destinationId: DESTINATION_ID,
        name: "Southern Mangrove Park",
        slug: "southern-mangrove-park",
        fullAddress: "Galang, Batam, Kepulauan Riau, Indonesia",
        latitude: "0.9100",
        longitude: "104.1900",
        estimatedDurationMinutes: 75,
        rating: 4.65,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
      {
        id: farBeachId,
        destinationId: DESTINATION_ID,
        name: "Southern Beach Walk",
        slug: "southern-beach-walk",
        fullAddress: "Galang, Batam, Kepulauan Riau, Indonesia",
        latitude: "0.9150",
        longitude: "104.1950",
        estimatedDurationMinutes: 75,
        rating: 4.6,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
        isActive: true,
      },
    ];
    const db = createMockDb({
      trips: [
        {
          id: TRIP_ID,
          userId: USER_ID,
          destinationId: DESTINATION_ID,
          planningMode: "ai_assisted",
          startDate: "2026-04-01",
          endDate: "2026-04-02",
          budget: "2500000.00",
        },
      ],
      preferenceCategories: [
        {
          id: HISTORY_ID,
          name: "History",
          slug: "history",
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
          preferenceCategoryId: HISTORY_ID,
        },
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          tripId: TRIP_ID,
          preferenceCategoryId: FOOD_ID,
        },
      ],
      attractions: customAttractions,
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
          attractionId: northHistoryId,
          attractionCategoryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        {
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          attractionId: southFoodId,
          attractionCategoryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
        {
          id: "12121212-1212-4212-8212-121212121212",
          attractionId: northViewId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "13131313-1313-4313-8313-131313131313",
          attractionId: northParkId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "14141414-1414-4414-8414-141414141414",
          attractionId: farViewId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "15151515-1515-4515-8515-151515151515",
          attractionId: farParkId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "16161616-1616-4616-8616-161616161616",
          attractionId: northGardenId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "17171717-1717-4717-8717-171717171717",
          attractionId: farBeachId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
      ],
    });
    const service = createAiPlanningService({
      dbProvider: () => db,
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.days[0].items.map((item) => item.attractionId)).toEqual([
      northHistoryId,
      northViewId,
      northParkId,
    ]);
    expect(preview.days[0].items).toHaveLength(3);
    expect(preview.days[0].items.every((item) => item.attractionId !== southFoodId)).toBe(true);
    expect(preview.days[1].items[0].attractionId).toBe(southFoodId);
    expect(preview.days[1].items.map((item) => item.attractionId)).toEqual(
      expect.arrayContaining([southFoodId, farParkId, farBeachId])
    );
  });

  test("uses visit-time hints so morning heritage stops land before sunset and evening venues", async () => {
    const morningTempleId = "90909090-9090-4090-8090-909090909090";
    const sunsetTempleId = "91919191-9191-4191-8191-919191919191";
    const eveningViewId = "92929292-9292-4292-8292-929292929292";
    const db = createMockDb({
      trips: [
        {
          id: TRIP_ID,
          userId: USER_ID,
          destinationId: DESTINATION_ID,
          planningMode: "ai_assisted",
          startDate: "2026-04-01",
          endDate: "2026-04-01",
          budget: "2500000.00",
        },
      ],
      preferenceCategories: [
        {
          id: HISTORY_ID,
          name: "History",
          slug: "history",
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
          preferenceCategoryId: HISTORY_ID,
        },
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          tripId: TRIP_ID,
          preferenceCategoryId: FOOD_ID,
        },
      ],
      attractions: [
        {
          id: morningTempleId,
          destinationId: DESTINATION_ID,
          name: "Plaosan Temple",
          slug: "plaosan-temple",
          fullAddress: "Prambanan, Yogyakarta",
          latitude: "-7.7423804",
          longitude: "110.5048538",
          estimatedDurationMinutes: 120,
          rating: 4.6,
          openingHours: alwaysOpen,
          metadata: { best_time: "morning" },
          thumbnailImageUrl: null,
          mainImageUrl: null,
          isActive: true,
        },
        {
          id: sunsetTempleId,
          destinationId: DESTINATION_ID,
          name: "Candi Ijo",
          slug: "candi-ijo",
          fullAddress: "Prambanan, Yogyakarta",
          latitude: "-7.7837789",
          longitude: "110.5128516",
          estimatedDurationMinutes: 90,
          rating: 4.75,
          openingHours: alwaysOpen,
          metadata: { best_time: "sunset" },
          thumbnailImageUrl: null,
          mainImageUrl: null,
          isActive: true,
        },
        {
          id: eveningViewId,
          destinationId: DESTINATION_ID,
          name: "Obelix Hills",
          slug: "obelix-hills",
          fullAddress: "Prambanan, Yogyakarta",
          latitude: "-7.8189011",
          longitude: "110.5033869",
          estimatedDurationMinutes: 120,
          rating: 4.9,
          openingHours: eveningOpen,
          metadata: { best_time: "sunset" },
          thumbnailImageUrl: null,
          mainImageUrl: null,
          isActive: true,
        },
      ],
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
          id: "18181818-1818-4818-8818-181818181818",
          attractionId: morningTempleId,
          attractionCategoryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        {
          id: "19191919-1919-4919-8919-191919191919",
          attractionId: sunsetTempleId,
          attractionCategoryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        {
          id: "20202020-2020-4920-8920-202020202021",
          attractionId: sunsetTempleId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "21212121-2121-4121-8121-212121212122",
          attractionId: eveningViewId,
          attractionCategoryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        {
          id: "22222222-2222-4222-8222-222222222223",
          attractionId: eveningViewId,
          attractionCategoryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
      ],
    });
    const service = createAiPlanningService({
      dbProvider: () => db,
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);
    const dayOneItems = preview.days[0].items;

    expect(dayOneItems.map((item) => item.attractionId)).toEqual([
      morningTempleId,
      sunsetTempleId,
      eveningViewId,
    ]);
    expect(dayOneItems[0].startTime < "11:00").toBe(true);
    expect(dayOneItems[1].startTime >= "15:00").toBe(true);
    expect(dayOneItems[2].startTime >= "17:00").toBe(true);
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

  test("falls back to deterministic ranking when provider reranking fails", async () => {
    const logger = {
      warn: jest.fn(),
    };
    const service = createService({
      planningProvider: createHuggingFacePlanningProvider({
        logger,
        inferenceClient: {
          async rankCandidates() {
            const error = new Error("Hugging Face request timed out.");
            error.code = "AI_TIMEOUT";
            error.status = 504;
            throw error;
          },
        },
      }),
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.strategy.mode).toBe("deterministic_only");
    expect(preview.strategy.provider).toBe("hugging-face");
    expect(preview.strategy.usedProviderRanking).toBe(false);
    expect(preview.days[0].items[0].attractionId).toBe(TEMPLE_ATTRACTION_ID);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Falling back to deterministic order"),
      expect.objectContaining({
        provider: "hugging-face",
        code: "AI_TIMEOUT",
        status: 504,
      })
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

  test("returns low-budget warnings without blocking preview generation", async () => {
    const service = createService({
      tripOverrides: {
        endDate: "2026-04-03",
        budget: "450000.00",
      },
    });

    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.budget).toBe("450000.00");
    expect(preview.budgetFit).toEqual({
      level: "very_low",
      perDayBudget: 150000,
      isApproximate: true,
      reasoning:
        "Budget averages about 150,000 per day across 3 day(s), so this preview should be treated as a very rough, lighter-spend plan only.",
    });
    expect(preview.budgetWarnings).toEqual(
      expect.arrayContaining([
        "Trip budget is very low relative to 3 day(s) of travel (about 150,000 per day).",
        "Budget fit is approximate because attraction-level pricing, transport, food, and lodging costs are not stored in the current catalog yet.",
      ])
    );
    expect(preview.warnings).toEqual(
      expect.arrayContaining(preview.budgetWarnings)
    );
  });

  test("treats popular as an intentional destination-wide preference without warning", async () => {
    const db = createMockDb({
      trips: [
        {
          id: TRIP_ID,
          userId: USER_ID,
          destinationId: DESTINATION_ID,
          planningMode: "ai_assisted",
          startDate: "2026-04-01",
          endDate: "2026-04-01",
          budget: "2500000.00",
        },
      ],
      preferenceCategories: [
        {
          id: "10101010-1010-4010-8010-101010101010",
          name: "Popular",
          slug: "popular",
          description: "Most popular attractions.",
          sortOrder: 1,
          isActive: true,
        },
      ],
      tripPreferenceCategories: [
        {
          id: "20202020-2020-4020-8020-202020202020",
          tripId: TRIP_ID,
          preferenceCategoryId: "10101010-1010-4010-8010-101010101010",
        },
      ],
      attractions: baseAttractions,
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

    const service = createAiPlanningService({
      dbProvider: () => db,
    });
    const preview = await service.generatePreview(USER_ID, TRIP_ID);

    expect(preview.preferences).toEqual([
      expect.objectContaining({
        slug: "popular",
        name: "Populer",
      }),
    ]);
    expect(preview.warnings).not.toContain(
      "Selected trip preferences do not have a direct attraction-category mapping yet, so the preview used destination-wide ranking."
    );
  });
});
