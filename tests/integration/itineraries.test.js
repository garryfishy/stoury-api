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
  buildAlternateBaliItineraryPayload,
  buildManualTripPayload,
  buildPrimaryBaliItineraryPayload,
} = require("./helpers/builders");

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
});

afterEach(async () => {
  seedData = await restoreDestinationStates();
});

afterAll(async () => {
  seedData = await restoreDestinationStates();
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("itineraries integration", () => {
  test("GET /api/trips/:tripId/itinerary returns an empty itinerary before save", async () => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-empty" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2026-12-01",
        endDate: "2026-12-02",
      })
    );

    const response = await request(app)
      .get(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      itineraryId: null,
      tripId: trip.body.data.id,
      destinationId: seedData.destinations.bali.id,
      planningMode: "manual",
      startDate: "2026-12-01",
      endDate: "2026-12-02",
      hasItinerary: false,
      days: [],
    });
  });

  test("GET /api/trips/:tripId/itinerary enforces auth and ownership", async () => {
    const owner = await registerAndLogin(request, app, { label: "itinerary-owner" });
    const otherUser = await registerAndLogin(request, app, { label: "itinerary-other" });
    const trip = await createTrip(
      owner.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2026-12-10",
        endDate: "2026-12-11",
      })
    );

    const unauthenticatedResponse = await request(app).get(
      `/api/trips/${trip.body.data.id}/itinerary`
    );

    expect(unauthenticatedResponse.status).toBe(401);

    const otherUserResponse = await request(app)
      .get(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(otherUser.accessToken));

    expect(otherUserResponse.status).toBe(404);
    expect(otherUserResponse.body.message).toBe("Trip not found.");
  });

  test("PUT /api/trips/:tripId/itinerary saves and reloads a valid itinerary", async () => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-save" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-01-01",
        endDate: "2027-01-02",
      })
    );
    const payload = buildPrimaryBaliItineraryPayload(seedData);

    const saveResponse = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(payload);

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.data.itineraryId).toEqual(expect.any(String));
    expect(saveResponse.body.data.tripId).toBe(trip.body.data.id);
    expect(saveResponse.body.data.hasItinerary).toBe(true);
    expect(saveResponse.body.data.days).toHaveLength(2);
    expect(saveResponse.body.data.days[0].dayNumber).toBe(1);
    expect(saveResponse.body.data.days[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "manual",
          attraction: expect.objectContaining({
            name: "Tanah Lot",
            latitude: expect.any(String),
            longitude: expect.any(String),
            fullAddress: expect.any(String),
            enrichment: expect.any(Object),
            categories: expect.arrayContaining([
              expect.objectContaining({ slug: "beach" }),
            ]),
          }),
        }),
      ])
    );
    expect(
      saveResponse.body.data.days[0].items[0].attraction.enrichment
    ).toHaveProperty("externalSource");
    expect(
      saveResponse.body.data.days[0].items[0].attraction.enrichment
    ).toHaveProperty("externalPlaceId");
    expect(saveResponse.body.data.days[1].dayNumber).toBe(2);

    const getResponse = await request(app)
      .get(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.hasItinerary).toBe(true);
    expect(getResponse.body.data.days).toHaveLength(2);
  });

  test("saving a new itinerary replaces the old itinerary contents", async () => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-overwrite" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-01-10",
        endDate: "2027-01-11",
      })
    );

    await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(buildPrimaryBaliItineraryPayload(seedData));

    const overwriteResponse = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(buildAlternateBaliItineraryPayload(seedData));

    expect(overwriteResponse.status).toBe(200);
    expect(
      overwriteResponse.body.data.days.flatMap((day) =>
        day.items.map((item) => item.attraction.slug)
      )
    ).toEqual([
      "uluwatu-temple",
      "garuda-wisnu-kencana-cultural-park",
      "nusa-dua-beach",
      "jimbaran-bay",
    ]);
  });

  test.each([
    [
      "non-sequential day numbers",
      () => ({
        days: [
          buildPrimaryBaliItineraryPayload(seedData).days[0],
          { ...buildPrimaryBaliItineraryPayload(seedData).days[1], dayNumber: 3 },
        ],
      }),
      "Itinerary days must be sequential starting at 1.",
    ],
    [
      "days starting at 2",
      () => ({
        days: [
          { ...buildPrimaryBaliItineraryPayload(seedData).days[0], dayNumber: 2 },
        ],
      }),
      "Itinerary days must be sequential starting at 1.",
    ],
    [
      "too many days",
      () => ({
        days: [
          buildPrimaryBaliItineraryPayload(seedData).days[0],
          buildPrimaryBaliItineraryPayload(seedData).days[1],
          {
            dayNumber: 3,
            items: [],
          },
        ],
      }),
      "Itinerary day count exceeds the trip date range.",
    ],
  ])("validates %s", async (_label, buildPayload, message) => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-day-validation" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-02-01",
        endDate: "2027-02-02",
      })
    );

    const response = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(buildPayload());

    expect(response.status).toBe(422);
    expect(response.body.message).toBe(message);
  });

  test("allows a partial itinerary with fewer days than the trip duration", async () => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-partial" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-02-10",
        endDate: "2027-02-12",
      })
    );

    const response = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send({
        days: [buildPrimaryBaliItineraryPayload(seedData).days[0]],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.days).toHaveLength(1);
  });

  test.each([
    [
      "duplicate attractions",
      () => ({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 1,
                startTime: "09:00",
                endTime: "10:30",
              },
            ],
          },
          {
            dayNumber: 2,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 1,
                startTime: "09:00",
                endTime: "10:30",
              },
            ],
          },
        ],
      }),
      "The same attraction cannot appear twice in a trip itinerary.",
    ],
    [
      "cross-destination attractions",
      () => ({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["malioboro-street"].id,
                orderIndex: 1,
                startTime: "09:00",
                endTime: "11:00",
              },
            ],
          },
        ],
      }),
      () =>
        `Attraction ${seedData.attractions["malioboro-street"].id} belongs to another destination.`,
    ],
    [
      "unknown attractions",
      () => ({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: "11111111-1111-4111-8111-111111111111",
                orderIndex: 1,
                startTime: "09:00",
                endTime: "11:00",
              },
            ],
          },
        ],
      }),
      "Attraction 11111111-1111-4111-8111-111111111111 does not exist.",
    ],
    [
      "overlapping times",
      () => ({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 1,
                startTime: "09:00",
                endTime: "11:00",
              },
              {
                attractionId: seedData.attractions["sacred-monkey-forest-sanctuary"].id,
                orderIndex: 2,
                startTime: "10:30",
                endTime: "12:00",
              },
            ],
          },
        ],
      }),
      "Itinerary item times for day 1 overlap.",
    ],
    [
      "non-sequential order indexes",
      () => ({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 2,
                startTime: "09:00",
                endTime: "11:00",
              },
            ],
          },
        ],
      }),
      "Itinerary items for day 1 must use sequential orderIndex values starting at 1.",
    ],
    [
      "outside opening hours",
      () => ({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 1,
                startTime: "06:00",
                endTime: "07:00",
              },
            ],
          },
        ],
      }),
      () =>
        `Attraction ${seedData.attractions["tanah-lot"].id} is outside its opening hours on day 1.`,
    ],
  ])("rejects %s", async (_label, buildPayload, expectedMessage) => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-item-validation" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-03-01",
        endDate: "2027-03-02",
      })
    );

    const response = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(buildPayload());

    expect(response.status).toBe(422);
    expect(response.body.message).toBe(
      typeof expectedMessage === "function" ? expectedMessage() : expectedMessage
    );
  });

  test("rejects startTime after endTime through validation", async () => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-invalid-time" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-03-10",
        endDate: "2027-03-11",
      })
    );

    const response = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 1,
                startTime: "12:00",
                endTime: "11:00",
              },
            ],
          },
        ],
      });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "days.0.items.0.startTime" }),
      ])
    );
  });

  test("accepts null item times and keeps source defaults", async () => {
    const auth = await registerAndLogin(request, app, { label: "itinerary-null-times" });
    const trip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-03-20",
        endDate: "2027-03-20",
      })
    );

    const response = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send({
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: seedData.attractions["tanah-lot"].id,
                orderIndex: 1,
                startTime: null,
                endTime: null,
              },
            ],
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.days[0].items[0]).toEqual(
      expect.objectContaining({
        startTime: null,
        endTime: null,
        source: "manual",
      })
    );
  });

  test("PUT /api/trips/:tripId/itinerary enforces auth and ownership", async () => {
    const owner = await registerAndLogin(request, app, { label: "itinerary-save-owner" });
    const otherUser = await registerAndLogin(request, app, { label: "itinerary-save-other" });
    const trip = await createTrip(
      owner.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        startDate: "2027-04-01",
        endDate: "2027-04-02",
      })
    );
    const payload = buildPrimaryBaliItineraryPayload(seedData);

    const unauthenticatedResponse = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .send(payload);

    expect(unauthenticatedResponse.status).toBe(401);

    const otherUserResponse = await request(app)
      .put(`/api/trips/${trip.body.data.id}/itinerary`)
      .set(authHeader(otherUser.accessToken))
      .send(payload);

    expect(otherUserResponse.status).toBe(404);
    expect(otherUserResponse.body.message).toBe("Trip not found.");
  });
});
