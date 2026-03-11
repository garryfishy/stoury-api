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

const createTrip = (accessToken, payload) =>
  request(app).post("/api/trips").set(authHeader(accessToken)).send(payload);

let seedData;

beforeAll(async () => {
  await ensureTestDbReady();
  await cleanupTestArtifacts();
  seedData = await loadSeedData();
});

afterEach(async () => {
  seedData = await restoreDestinationStates();
});

afterAll(async () => {
  seedData = await restoreDestinationStates();
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("trips integration", () => {
  test("creates a manual trip using profile preferences", async () => {
    const auth = await registerAndLogin(request, app, { label: "trips-create-profile" });

    await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({
        categoryIds: [
          seedData.preferenceCategories.popular.id,
          seedData.preferenceCategories.food.id,
        ],
      });

    const response = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: "Bali Getaway",
        userId: auth.user.id,
        destinationId: seedData.destinations.batam.id,
        planningMode: "manual",
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        durationDays: 3,
        budget: "5000000.00",
        hasItinerary: false,
        destination: expect.objectContaining({
          slug: "batam",
        }),
        preferences: [
          expect.objectContaining({ slug: "popular" }),
          expect.objectContaining({ slug: "food" }),
        ],
      })
    );
  });

  test("creates an ai_assisted trip using custom preferences", async () => {
    const auth = await registerAndLogin(request, app, { label: "trips-create-custom" });

    const response = await createTrip(
      auth.accessToken,
      buildAiTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "Batam History Trip",
        preferenceCategoryIds: [
          seedData.preferenceCategories.history.id,
          seedData.preferenceCategories.food.id,
        ],
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        title: "Batam History Trip",
        planningMode: "ai_assisted",
        destinationId: seedData.destinations.batam.id,
        durationDays: 3,
        budget: "3000000.00",
        preferences: [
          expect.objectContaining({ slug: "food" }),
          expect.objectContaining({ slug: "history" }),
        ],
      })
    );
  });

  test.each([
    [
      "missing destination",
      () =>
        buildManualTripPayload({
          destinationId: "11111111-1111-4111-8111-111111111111",
        }),
      422,
      "Destination not found.",
    ],
    [
      "invalid date range",
      () =>
        buildManualTripPayload({
          destinationId: seedData.destinations.batam.id,
          startDate: "2026-06-05",
          endDate: "2026-06-03",
        }),
      422,
      "startDate must be on or before endDate.",
    ],
    [
      "unknown preference categories",
      () =>
        buildAiTripPayload({
          destinationId: seedData.destinations.batam.id,
          preferenceCategoryIds: ["11111111-1111-4111-8111-111111111111"],
        }),
      422,
      "One or more trip preference categories do not exist.",
    ],
  ])("POST /api/trips rejects %s", async (_label, buildPayload, statusCode, message) => {
    const auth = await registerAndLogin(request, app, { label: "trips-invalid" });

    const response = await createTrip(auth.accessToken, buildPayload());

    expect(response.status).toBe(statusCode);
    if (message === "startDate must be on or before endDate.") {
      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed.",
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: "startDate",
            message,
          }),
        ]),
      });
      return;
    }

    expect(response.body.message).toBe(message);
  });

  test.each([
    [
      "invalid planning mode",
      () => ({
        ...buildManualTripPayload({
          destinationId: seedData.destinations.batam.id,
        }),
        planningMode: "unsupported",
      }),
      "planningMode",
    ],
    [
      "negative budget",
      () => ({
        ...buildManualTripPayload({
          destinationId: seedData.destinations.batam.id,
        }),
        budget: -1,
      }),
      "budget",
    ],
    [
      "custom preferences without ids",
      () => ({
        ...buildAiTripPayload({
          destinationId: seedData.destinations.batam.id,
        }),
        preferenceCategoryIds: undefined,
      }),
      "preferenceCategoryIds",
    ],
  ])("POST /api/trips returns 422 for %s", async (_label, buildPayload, path) => {
    const auth = await registerAndLogin(request, app, { label: "trips-validation" });

    const response = await createTrip(auth.accessToken, buildPayload());

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path }),
      ])
    );
  });

  test("rejects trip creation for inactive destinations with a clear message", async () => {
    seedData = await setDestinationActiveState("yogyakarta", false);
    const auth = await registerAndLogin(request, app, { label: "trips-inactive-create" });

    const response = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.yogyakarta.id,
        title: "Blocked Inactive Destination",
      })
    );

    expect(response.status).toBe(422);
    expect(response.body.message).toBe(
      "Destination is inactive and cannot be used for trip planning."
    );
  });

  test("enforces overlap conflicts only for the same destination", async () => {
    seedData = await setDestinationActiveState("bali", true);
    const auth = await registerAndLogin(request, app, { label: "trips-overlap" });

    const firstTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "First Batam Trip",
      })
    );

    expect(firstTrip.status).toBe(201);

    const conflictingTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "Conflicting Batam Trip",
      })
    );

    expect(conflictingTrip.status).toBe(409);
    expect(conflictingTrip.body.message).toBe(
      "You already have an overlapping trip for this destination in the selected date range."
    );

    const differentDestinationTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Bali Same Dates",
      })
    );

    expect(differentDestinationTrip.status).toBe(201);

    const nonOverlappingTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "Later Batam Trip",
        startDate: "2026-06-05",
        endDate: "2026-06-07",
      })
    );

    expect(nonOverlappingTrip.status).toBe(201);
  });

  test("GET /api/trips lists only the current user's trips in newest-first order with hasItinerary", async () => {
    seedData = await setDestinationActiveState("bali", true);
    const auth = await registerAndLogin(request, app, { label: "trips-list-owner" });
    const otherUser = await registerAndLogin(request, app, { label: "trips-list-other" });

    const olderTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Older Trip",
        startDate: "2026-08-01",
        endDate: "2026-08-02",
      })
    );
    const newerTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "Newer Trip",
        startDate: "2026-08-05",
        endDate: "2026-08-06",
      })
    );

    await request(app)
      .put(`/api/trips/${olderTrip.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(buildPrimaryBaliItineraryPayload(seedData));

    await createTrip(
      otherUser.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "Other User Trip",
        startDate: "2026-08-10",
        endDate: "2026-08-11",
      })
    );

    const response = await request(app)
      .get("/api/trips")
      .set(authHeader(auth.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data.map((trip) => trip.title)).toEqual([
      "Newer Trip",
      "Older Trip",
    ]);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        budget: "5000000.00",
        hasItinerary: false,
        destination: expect.objectContaining({ slug: "batam" }),
      })
    );
    expect(response.body.data[1]).toEqual(
      expect.objectContaining({
        budget: "5000000.00",
        hasItinerary: true,
        destination: expect.objectContaining({ slug: "bali" }),
      })
    );
  });

  test("GET /api/trips rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/trips");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  test("GET /api/trips/:tripId fetches a trip and hides other users' trips", async () => {
    seedData = await setDestinationActiveState("bali", true);
    const auth = await registerAndLogin(request, app, { label: "trips-detail-owner" });
    const otherUser = await registerAndLogin(request, app, { label: "trips-detail-other" });

    const ownTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Owned Trip",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
      })
    );
    const otherTrip = await createTrip(
      otherUser.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Other User Owned Trip",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
      })
    );

    const ownResponse = await request(app)
      .get(`/api/trips/${ownTrip.body.data.id}`)
      .set(authHeader(auth.accessToken));

    expect(ownResponse.status).toBe(200);
    expect(ownResponse.body.data).toEqual(
      expect.objectContaining({
        id: ownTrip.body.data.id,
        title: "Owned Trip",
        budget: "5000000.00",
        destination: expect.objectContaining({ slug: "bali" }),
        preferences: [],
      })
    );

    const otherTripResponse = await request(app)
      .get(`/api/trips/${otherTrip.body.data.id}`)
      .set(authHeader(auth.accessToken));

    expect(otherTripResponse.status).toBe(404);
    expect(otherTripResponse.body.message).toBe("Trip not found.");

    const invalidIdResponse = await request(app)
      .get("/api/trips/not-a-uuid")
      .set(authHeader(auth.accessToken));

    expect(invalidIdResponse.status).toBe(422);

    const missingIdResponse = await request(app)
      .get("/api/trips/11111111-1111-4111-8111-111111111111")
      .set(authHeader(auth.accessToken));

    expect(missingIdResponse.status).toBe(404);
  });

  test("PATCH /api/trips updates mutable fields and validates overlap plus ownership", async () => {
    seedData = await setDestinationActiveState("bali", true);
    const auth = await registerAndLogin(request, app, { label: "trips-update-owner" });
    const otherUser = await registerAndLogin(request, app, { label: "trips-update-other" });

    const targetTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Trip To Update",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
      })
    );
    const overlappingTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Another Bali Trip",
        startDate: "2026-10-06",
        endDate: "2026-10-08",
      })
    );
    const otherUserTrip = await createTrip(
      otherUser.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Foreign Trip",
        startDate: "2026-10-10",
        endDate: "2026-10-12",
      })
    );

    const titleUpdateResponse = await request(app)
      .patch(`/api/trips/${targetTrip.body.data.id}`)
      .set(authHeader(auth.accessToken))
      .send({ title: "Updated Trip Title", budget: 7777777 });

    expect(titleUpdateResponse.status).toBe(200);
    expect(titleUpdateResponse.body.data.title).toBe("Updated Trip Title");
    expect(Number(titleUpdateResponse.body.data.budget)).toBe(7777777);

    const overlapUpdateResponse = await request(app)
      .patch(`/api/trips/${targetTrip.body.data.id}`)
      .set(authHeader(auth.accessToken))
      .send({
        startDate: "2026-10-07",
        endDate: "2026-10-09",
      });

    expect(overlapUpdateResponse.status).toBe(409);
    expect(overlapUpdateResponse.body.message).toBe(
      "You already have an overlapping trip for this destination in the selected date range."
    );

    const otherUserUpdateResponse = await request(app)
      .patch(`/api/trips/${otherUserTrip.body.data.id}`)
      .set(authHeader(auth.accessToken))
      .send({ title: "Should Fail" });

    expect(otherUserUpdateResponse.status).toBe(404);
    expect(otherUserUpdateResponse.body.message).toBe("Trip not found.");

    const invalidUpdateResponse = await request(app)
      .patch(`/api/trips/${overlappingTrip.body.data.id}`)
      .set(authHeader(auth.accessToken))
      .send({});

    expect(invalidUpdateResponse.status).toBe(422);
    expect(invalidUpdateResponse.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "" }),
      ])
    );
  });

  test("PATCH /api/trips rejects switching to an inactive destination", async () => {
    const auth = await registerAndLogin(request, app, { label: "trips-inactive-update" });
    seedData = await setDestinationActiveState("yogyakarta", false);

    const targetTrip = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.batam.id,
        title: "Trip With Active Destination",
        startDate: "2026-10-20",
        endDate: "2026-10-22",
      })
    );

    expect(targetTrip.status).toBe(201);

    const response = await request(app)
      .patch(`/api/trips/${targetTrip.body.data.id}`)
      .set(authHeader(auth.accessToken))
      .send({
        destinationId: seedData.destinations.yogyakarta.id,
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe(
      "Destination is inactive and cannot be used for trip planning."
    );
  });

  test("PATCH /api/trips restricts destination, planningMode, and dates after an itinerary is saved but still allows title and budget", async () => {
    seedData = await setDestinationActiveState("bali", true);
    const auth = await registerAndLogin(request, app, { label: "trips-update-locked" });

    const tripResponse = await createTrip(
      auth.accessToken,
      buildManualTripPayload({
        destinationId: seedData.destinations.bali.id,
        title: "Locked Trip",
        startDate: "2026-11-01",
        endDate: "2026-11-02",
      })
    );
    const tripId = tripResponse.body.data.id;

    const saveItineraryResponse = await request(app)
      .put(`/api/trips/${tripId}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send({
        days: buildPrimaryBaliItineraryPayload(seedData).days.slice(0, 2),
      });

    expect(saveItineraryResponse.status).toBe(200);

    const restrictedUpdateResponse = await request(app)
      .patch(`/api/trips/${tripId}`)
      .set(authHeader(auth.accessToken))
      .send({
        destinationId: seedData.destinations.yogyakarta.id,
      });

    expect(restrictedUpdateResponse.status).toBe(409);
    expect(restrictedUpdateResponse.body.message).toBe(
      "Trips with an existing itinerary can only update title, budget, and preference snapshots in MVP."
    );

    const allowedUpdateResponse = await request(app)
      .patch(`/api/trips/${tripId}`)
      .set(authHeader(auth.accessToken))
      .send({
        title: "Locked Trip Renamed",
        budget: 4500000,
      });

    expect(allowedUpdateResponse.status).toBe(200);
    expect(allowedUpdateResponse.body.data.title).toBe("Locked Trip Renamed");
    expect(Number(allowedUpdateResponse.body.data.budget)).toBe(4500000);
    expect(allowedUpdateResponse.body.data.hasItinerary).toBe(true);
  });
});
