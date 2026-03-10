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
  buildPrimaryBaliItineraryPayload,
} = require("./helpers/builders");

jest.setTimeout(10000);

const createTrip = (accessToken, payload) =>
  request(app).post("/api/trips").set(authHeader(accessToken)).send(payload);

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

describe("full flow integration", () => {
  test("completes the manual trip planning journey", async () => {
    const auth = await registerAndLogin(request, app, { label: "flow-manual" });

    const setPreferencesResponse = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({
        categoryIds: [
          seedData.preferenceCategories.nature.id,
          seedData.preferenceCategories.food.id,
        ],
      });

    expect(setPreferencesResponse.status).toBe(200);

    const destinationsResponse = await request(app).get("/api/destinations");
    const bali = destinationsResponse.body.data.find(
      (destination) => destination.slug === "bali"
    );

    expect(bali).toBeDefined();

    const attractionsResponse = await request(app).get(
      `/api/destinations/${bali.id}/attractions`
    );

    expect(attractionsResponse.status).toBe(200);
    expect(attractionsResponse.body.data.items.length).toBeGreaterThanOrEqual(4);

    const tripResponse = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: bali.id,
        startDate: "2027-06-01",
        endDate: "2027-06-02",
      })
    );

    expect(tripResponse.status).toBe(201);
    expect(tripResponse.body.data.preferences.map((item) => item.slug)).toEqual([
      "nature",
      "food",
    ]);

    const itineraryPayload = buildPrimaryBaliItineraryPayload(seedData);
    const saveItineraryResponse = await request(app)
      .put(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(itineraryPayload);

    expect(saveItineraryResponse.status).toBe(200);

    const getItineraryResponse = await request(app)
      .get(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(getItineraryResponse.status).toBe(200);
    expect(getItineraryResponse.body.data.hasItinerary).toBe(true);
    expect(getItineraryResponse.body.data.days).toHaveLength(2);

    const updateTripResponse = await request(app)
      .patch(`/api/trips/${tripResponse.body.data.id}`)
      .set(authHeader(auth.accessToken))
      .send({ title: "Manual Flow Updated Title" });

    expect(updateTripResponse.status).toBe(200);
    expect(updateTripResponse.body.data.title).toBe("Manual Flow Updated Title");
    expect(updateTripResponse.body.data.hasItinerary).toBe(true);

    const itineraryAfterUpdateResponse = await request(app)
      .get(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(itineraryAfterUpdateResponse.status).toBe(200);
    expect(itineraryAfterUpdateResponse.body.data.days).toHaveLength(2);
  });

  test("completes the ai-assisted trip planning journey", async () => {
    const auth = await registerAndLogin(request, app, { label: "flow-ai" });

    await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({
        categoryIds: [
          seedData.preferenceCategories.culture.id,
          seedData.preferenceCategories.adventure.id,
        ],
      });

    const tripResponse = await createTrip(
      auth.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.yogyakarta.id,
        startDate: "2027-06-10",
        endDate: "2027-06-11",
        preferenceCategoryIds: [
          seedData.preferenceCategories.culture.id,
          seedData.preferenceCategories.food.id,
        ],
      })
    );

    expect(tripResponse.status).toBe(201);

    const previewResponse = await request(app)
      .post(`/api/trips/${tripResponse.body.data.id}/ai-generate`)
      .set(authHeader(auth.accessToken));

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.data.days).toHaveLength(2);

    const itineraryBeforeSaveResponse = await request(app)
      .get(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(itineraryBeforeSaveResponse.body.data.hasItinerary).toBe(false);

    const saveResponse = await request(app)
      .put(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send({
        days: previewResponse.body.data.days,
      });

    expect(saveResponse.status).toBe(200);

    const savedItineraryResponse = await request(app)
      .get(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(savedItineraryResponse.status).toBe(200);
    expect(savedItineraryResponse.body.data.hasItinerary).toBe(true);
    expect(
      savedItineraryResponse.body.data.days.every((day) =>
        day.items.every((item) => item.source === "ai_assisted")
      )
    ).toBe(true);
  });

  test("keeps trip preference snapshots isolated from later profile changes", async () => {
    const auth = await registerAndLogin(request, app, { label: "flow-snapshot" });

    await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({
        categoryIds: [
          seedData.preferenceCategories.nature.id,
          seedData.preferenceCategories.food.id,
        ],
      });

    const tripResponse = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-06-20",
        endDate: "2027-06-21",
      })
    );

    expect(tripResponse.status).toBe(201);
    expect(tripResponse.body.data.preferences.map((item) => item.slug)).toEqual([
      "nature",
      "food",
    ]);

    await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({
        categoryIds: [seedData.preferenceCategories.adventure.id],
      });

    const tripDetailResponse = await request(app)
      .get(`/api/trips/${tripResponse.body.data.id}`)
      .set(authHeader(auth.accessToken));

    expect(tripDetailResponse.status).toBe(200);
    expect(
      [...tripDetailResponse.body.data.preferences.map((item) => item.slug)].sort()
    ).toEqual(["food", "nature"]);
  });

  test("covers the token lifecycle end to end", async () => {
    const auth = await registerAndLogin(request, app, { label: "flow-token" });

    const profileResponse = await request(app)
      .get("/api/users/me")
      .set(authHeader(auth.accessToken));

    expect(profileResponse.status).toBe(200);

    const refreshResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken: auth.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);

    const oldRefreshResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken: auth.refreshToken,
    });

    expect(oldRefreshResponse.status).toBe(401);

    const newAccessProfileResponse = await request(app)
      .get("/api/users/me")
      .set(authHeader(refreshResponse.body.data.accessToken));

    expect(newAccessProfileResponse.status).toBe(200);

    const logoutResponse = await request(app).post("/api/auth/logout").send({
      refreshToken: refreshResponse.body.data.refreshToken,
    });

    expect(logoutResponse.status).toBe(200);

    const refreshAfterLogoutResponse = await request(app).post("/api/auth/refresh").send({
      refreshToken: refreshResponse.body.data.refreshToken,
    });

    expect(refreshAfterLogoutResponse.status).toBe(401);
  });
});
