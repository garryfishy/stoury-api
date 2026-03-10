const request = require("supertest");
const { app } = require("./helpers/app");
const { authHeader, registerAndLogin } = require("./helpers/auth");
const {
  cleanupTestArtifacts,
  closeTestDb,
  ensureTestDbReady,
} = require("./helpers/db");
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

afterAll(async () => {
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
          seedData.preferenceCategories.culture.id,
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
            source: "ai_assisted",
            attraction: expect.objectContaining({
              id: expect.any(String),
              destinationId: seedData.destinations.bali.id,
              categories: expect.any(Array),
            }),
          })
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

  test("generated preview days can be saved into the itinerary and retain ai_assisted source", async () => {
    const auth = await registerAndLogin(request, app, { label: "ai-save-flow" });
    const trip = await createTrip(
      auth.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.yogyakarta.id,
        startDate: "2027-05-10",
        endDate: "2027-05-11",
        preferenceCategoryIds: [
          seedData.preferenceCategories.culture.id,
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
        days: previewResponse.body.data.days,
      });

    expect(saveResponse.status).toBe(200);
    expect(
      saveResponse.body.data.days.every((day) =>
        day.items.every((item) => item.source === "ai_assisted")
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
        preferenceCategoryIds: [seedData.preferenceCategories.adventure.id],
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

