const request = require("supertest");
const { app } = require("./helpers/app");
const { authHeader, registerAndLogin } = require("./helpers/auth");
const {
  cleanupTestArtifacts,
  closeTestDb,
  ensureTestDbReady,
} = require("./helpers/db");
const {
  restoreDestinationStates,
  setDestinationActiveState,
} = require("./helpers/destination-state");
const { loadSeedData } = require("./helpers/seed-data");
const {
  buildAiTripPayload,
  buildManualTripPayload,
} = require("./helpers/builders");

const createTrip = (accessToken, payload) =>
  request(app).post("/api/trips").set(authHeader(accessToken)).send(payload);

const assertNonOverlappingItems = (items) => {
  for (let index = 1; index < items.length; index += 1) {
    expect(items[index - 1].endTime <= items[index].startTime).toBe(true);
  }
};

let seedData;

beforeAll(async () => {
  await ensureTestDbReady();
  await cleanupTestArtifacts();
  seedData = await loadSeedData();
});

beforeEach(async () => {
  seedData = await setDestinationActiveState("bali", true);
  seedData = await setDestinationActiveState("yogyakarta", true);
});

afterEach(async () => {
  seedData = await restoreDestinationStates();
});

afterAll(async () => {
  seedData = await restoreDestinationStates();
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("ai planning integration", () => {
  test("POST /api/trips/:tripId/ai-generate returns a valid preview without persisting it", async () => {
    const auth = await registerAndLogin(request, app, { label: "ai-preview" });
    const trip = await createTrip(
      auth.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-05-01",
        endDate: "2027-05-02",
        preferenceCategoryIds: [
          seedData.preferenceCategories.history.id,
          seedData.preferenceCategories.food.id,
        ],
      })
    );

    const previewResponse = await request(app)
      .post(`/api/trips/${trip.body.data.id}/ai-generate`)
      .set(authHeader(auth.accessToken));

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.success).toBe(true);
    expect(previewResponse.body.data).toEqual(
      expect.objectContaining({
        tripId: trip.body.data.id,
        destinationId: seedData.destinations.bali.id,
        planningMode: "ai_assisted",
        startDate: "2027-05-01",
        endDate: "2027-05-02",
        generatedAt: expect.any(String),
        budget: expect.anything(),
        budgetFit: expect.objectContaining({
          level: expect.any(String),
          perDayBudget: expect.any(Number),
          isApproximate: true,
          reasoning: expect.any(String),
        }),
        budgetWarnings: expect.any(Array),
        strategy: expect.objectContaining({
          mode: expect.any(String),
          provider: expect.any(String),
          usedProviderRanking: expect.any(Boolean),
        }),
        warnings: expect.any(Array),
        days: expect.any(Array),
      })
    );
    expect(previewResponse.body.data.days).toHaveLength(2);

    const allItems = previewResponse.body.data.days.flatMap((day) => day.items);
    const uniqueAttractionIds = new Set(allItems.map((item) => item.attractionId));

    expect(allItems.length).toBeGreaterThan(0);
    expect(uniqueAttractionIds.size).toBe(allItems.length);

    previewResponse.body.data.days.forEach((day, index) => {
      expect(day).toEqual(
        expect.objectContaining({
          dayNumber: index + 1,
          date: expect.any(String),
          items: expect.any(Array),
        })
      );

      day.items.forEach((item, itemIndex) => {
        expect(item).toEqual(
          expect.objectContaining({
            attractionId: expect.any(String),
            attractionName: expect.any(String),
            startTime: expect.any(String),
            endTime: expect.any(String),
            orderIndex: itemIndex + 1,
            estimatedBudgetMin: expect.any(Number),
            estimatedBudgetMax: expect.any(Number),
            estimatedBudgetNote: expect.any(String),
            source: "ai_assisted",
            attraction: expect.objectContaining({
              id: expect.any(String),
              destinationId: seedData.destinations.bali.id,
              latitude: expect.any(String),
              longitude: expect.any(String),
              fullAddress: expect.any(String),
              openingHours: expect.any(Object),
              tripDayOpeningHours: expect.any(Array),
              tripDayIsOpen: expect.any(Boolean),
              thumbnailImageUrl: expect.stringContaining("/api/attractions/"),
              mainImageUrl: expect.stringContaining("/api/attractions/"),
              enrichment: expect.any(Object),
              primaryPreference: expect.objectContaining({
                slug: expect.stringMatching(/^(popular|food|shopping|history)$/),
                name: expect.stringMatching(/^(Populer|Makanan|Belanja|Sejarah)$/),
              }),
              categories: expect.any(Array),
            }),
          })
        );
        expect(item.attraction.enrichment).toHaveProperty("externalSource");
        expect(item.attraction.enrichment).toHaveProperty("externalPlaceId");
        expect(item.attraction.tripDayOpeningHours).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              open: expect.stringMatching(/^\d{2}:\d{2}$/),
              close: expect.stringMatching(/^\d{2}:\d{2}$/),
            }),
          ])
        );
        expect(item.attraction.tripDayIsOpen).toBe(
          item.attraction.tripDayOpeningHours.length > 0
        );
        expect(item.estimatedBudgetMin).toBeGreaterThanOrEqual(0);
        expect(item.estimatedBudgetMax).toBeGreaterThanOrEqual(
          item.estimatedBudgetMin
        );
        expect(item.startTime < item.endTime).toBe(true);
      });

      assertNonOverlappingItems(day.items);
    });

    const itineraryResponse = await request(app)
      .get(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(itineraryResponse.status).toBe(200);
    expect(itineraryResponse.body.data.hasItinerary).toBe(false);
    expect(itineraryResponse.body.data.days).toEqual([]);
  });

  test("POST /api/trips/:tripId/ai-generate returns explicit low-budget warnings without failing", async () => {
    const auth = await registerAndLogin(request, app, { label: "ai-preview-low-budget" });
    const trip = await createTrip(
      auth.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-05-05",
        endDate: "2027-05-07",
        budget: 450000,
        preferenceCategoryIds: [
          seedData.preferenceCategories.history.id,
          seedData.preferenceCategories.food.id,
        ],
      })
    );

    const previewResponse = await request(app)
      .post(`/api/trips/${trip.body.data.id}/ai-generate`)
      .set(authHeader(auth.accessToken));

    expect(previewResponse.status).toBe(200);
    expect(Number(previewResponse.body.data.budget)).toBe(450000);
    expect(previewResponse.body.data.budgetFit).toEqual(
      expect.objectContaining({
        level: "very_low",
        perDayBudget: 150000,
        isApproximate: true,
      })
    );
    expect(previewResponse.body.data.budgetWarnings).toEqual(
      expect.arrayContaining([
        "Trip budget is very low relative to 3 day(s) of travel (about 150,000 per day).",
        "Budget fit is approximate because attraction-level pricing, transport, food, and lodging costs are not stored in the current catalog yet.",
      ])
    );
    expect(previewResponse.body.data.warnings).toEqual(
      expect.arrayContaining(previewResponse.body.data.budgetWarnings)
    );
  });

  test("generated preview days can be saved into the itinerary and retain ai_assisted source", async () => {
    const auth = await registerAndLogin(request, app, { label: "ai-save-flow" });
    const trip = await createTrip(
      auth.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.yogyakarta.id,
        startDate: "2027-05-10",
        endDate: "2027-05-11",
        preferenceCategoryIds: [
          seedData.preferenceCategories.history.id,
          seedData.preferenceCategories.food.id,
        ],
      })
    );

    const previewResponse = await request(app)
      .post(`/api/trips/${trip.body.data.id}/ai-generate`)
      .set(authHeader(auth.accessToken));

    expect(previewResponse.status).toBe(200);

    const saveResponse = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send({
        days: previewResponse.body.data.days.map((day) => ({
          ...day,
          items: day.items.map((item) => ({
            ...item,
            attractionId: item.attractionId.toUpperCase(),
          })),
        })),
      });

    expect(saveResponse.status).toBe(200);
    expect(
      saveResponse.body.data.days.every((day) =>
        day.items.every((item) => item.source === "ai_assisted")
      )
    ).toBe(true);
    expect(
      saveResponse.body.data.days.every((day) =>
        day.items.every(
          (item) =>
            typeof item.estimatedBudgetMin === "number" &&
            typeof item.estimatedBudgetMax === "number" &&
            typeof item.estimatedBudgetNote === "string"
        )
      )
    ).toBe(true);

    const getResponse = await request(app)
      .get(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.hasItinerary).toBe(true);
    expect(
      getResponse.body.data.days.every((day) =>
        day.items.every((item) => item.source === "ai_assisted")
      )
    ).toBe(true);
    expect(getResponse.body.data.days).toEqual(
      expect.arrayContaining(
        saveResponse.body.data.days.map((day) =>
          expect.objectContaining({
            dayNumber: day.dayNumber,
            items: expect.arrayContaining(
              day.items.map((item) =>
                expect.objectContaining({
                  attractionId: item.attractionId,
                  estimatedBudgetMin: item.estimatedBudgetMin,
                  estimatedBudgetMax: item.estimatedBudgetMax,
                  estimatedBudgetNote: item.estimatedBudgetNote,
                })
              )
            ),
          })
        )
      )
    );
  });

  test("rejects ai generation for manual trips", async () => {
    const auth = await registerAndLogin(request, app, { label: "ai-manual-trip" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-05-20",
        endDate: "2027-05-21",
      })
    );

    const response = await request(app)
      .post(`/api/trips/${trip.body.data.id}/ai-generate`)
      .set(authHeader(auth.accessToken));

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "AI itinerary preview is only available for ai_assisted trips."
    );
  });

  test("enforces auth, ownership, and missing-trip behavior", async () => {
    const owner = await registerAndLogin(request, app, { label: "ai-owner" });
    const otherUser = await registerAndLogin(request, app, { label: "ai-other" });
    const trip = await createTrip(
      owner.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-05-25",
        endDate: "2027-05-26",
        preferenceCategoryIds: [seedData.preferenceCategories.popular.id],
      })
    );

    const unauthenticatedResponse = await request(app).post(
      `/api/trips/${trip.body.data.id}/ai-generate`
    );

    expect(unauthenticatedResponse.status).toBe(401);

    const otherUserResponse = await request(app)
      .post(`/api/trips/${trip.body.data.id}/ai-generate`)
      .set(authHeader(otherUser.accessToken));

    expect(otherUserResponse.status).toBe(404);
    expect(otherUserResponse.body.message).toBe("Trip not found.");

    const missingTripResponse = await request(app)
      .post("/api/trips/11111111-1111-4111-8111-111111111111/ai-generate")
      .set(authHeader(owner.accessToken));

    expect(missingTripResponse.status).toBe(404);
    expect(missingTripResponse.body.message).toBe("Trip not found.");
  });
});
