const request = require("supertest");
const { app } = require("./helpers/app");
const {
  authHeader,
  grantRole,
  loginWithCredentials,
  registerAndLogin,
} = require("./helpers/auth");
const {
  cleanupTestArtifacts,
  closeTestDb,
  db,
  ensureTestDbReady,
} = require("./helpers/db");
const { googlePlacesClient } = require("../../src/services/google-places");

const touchedAttractionIds = new Set();
let destinationAttractions = [];

const toCoordinateNumber = (value) => Number(value);

const buildCandidateFromAttraction = (attraction, overrides = {}) => ({
  placeId: overrides.placeId || `place-${attraction.id}`,
  name: overrides.name || attraction.name,
  formattedAddress:
    overrides.formattedAddress || attraction.fullAddress || `${attraction.name}, Indonesia`,
  location: overrides.location || {
    latitude: toCoordinateNumber(attraction.latitude),
    longitude: toCoordinateNumber(attraction.longitude),
  },
  rating: overrides.rating ?? 4.4,
  userRatingsTotal: overrides.userRatingsTotal ?? 1234,
  types: overrides.types || ["tourist_attraction"],
});

const buildPlaceDetails = (candidate, overrides = {}) => ({
  ...candidate,
  url: overrides.url || "https://maps.google.com/?cid=1234567890",
  websiteUri: overrides.websiteUri ?? null,
});

const buildCandidateFromQuery = (query, placeId, overrides = {}) => ({
  placeId,
  name: String(query || "").split(",")[0].trim(),
  formattedAddress: overrides.formattedAddress || "Indonesia",
  location: overrides.location ?? null,
  rating: overrides.rating ?? 4.4,
  userRatingsTotal: overrides.userRatingsTotal ?? 1234,
  types: overrides.types || ["tourist_attraction"],
});

const resetTouchedAttractions = async () => {
  if (!touchedAttractionIds.size) {
    return;
  }

  await db.Attraction.update(
    {
      externalSource: null,
      externalPlaceId: null,
      externalRating: null,
      externalReviewCount: null,
      externalLastSyncedAt: null,
      thumbnailImageUrl: null,
      mainImageUrl: null,
    },
    {
      where: {
        id: [...touchedAttractionIds],
      },
    }
  );

  touchedAttractionIds.clear();
};

const registerAdmin = async (label) => {
  const auth = await registerAndLogin(request, app, { label });
  await grantRole(auth.user.id, "admin");
  const loginData = await loginWithCredentials(request, app, {
    email: auth.email,
    password: auth.password,
  });

  return {
    ...auth,
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
    user: loginData.user,
  };
};

beforeAll(async () => {
  await ensureTestDbReady();
  await cleanupTestArtifacts();

  const attractions = await db.Attraction.findAll({
    where: {
      isActive: true,
    },
    order: [["destinationId", "ASC"], ["name", "ASC"]],
  });
  const attractionsByDestination = attractions.reduce((map, attraction) => {
    const destinationId = attraction.destinationId;

    if (!map.has(destinationId)) {
      map.set(destinationId, []);
    }

    map.get(destinationId).push(attraction);
    return map;
  }, new Map());

  destinationAttractions =
    [...attractionsByDestination.values()].find((records) => records.length >= 3) || [];

  expect(destinationAttractions.length).toBeGreaterThanOrEqual(3);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await resetTouchedAttractions();
  await cleanupTestArtifacts();
});

afterAll(async () => {
  await resetTouchedAttractions();
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("admin attractions integration", () => {
  test("rejects non-admin access to enrichment endpoints", async () => {
    const auth = await registerAndLogin(request, app, { label: "admin-forbidden" });

    const response = await request(app)
      .get("/api/admin/attractions/enrichment-pending")
      .set(authHeader(auth.accessToken));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have permission to perform this action."
    );
  });

  test("lists pending attraction enrichment for admins", async () => {
    const admin = await registerAdmin("admin-pending");
    const targetAttraction = destinationAttractions[0];
    touchedAttractionIds.add(targetAttraction.id);

    await db.Attraction.update(
      {
        externalSource: null,
        externalPlaceId: null,
        externalRating: null,
        externalReviewCount: null,
        externalLastSyncedAt: null,
      },
      {
        where: {
          id: targetAttraction.id,
        },
      }
    );

    const response = await request(app)
      .get("/api/admin/attractions/enrichment-pending")
      .query({
        destinationId: targetAttraction.destinationId,
        status: "pending",
        limit: 5,
      })
      .set(authHeader(admin.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    response.body.data.items.forEach((item) => {
      expect(item.destination.id).toBe(targetAttraction.destinationId);
      expect(item.enrichment.status).toBe("pending");
    });
  });

  test("rate limits repeated admin pending-enrichment requests", async () => {
    const admin = await registerAdmin("admin-rate-read");

    const first = await request(app)
      .get("/api/admin/attractions/enrichment-pending")
      .set(authHeader(admin.accessToken));
    const second = await request(app)
      .get("/api/admin/attractions/enrichment-pending")
      .set(authHeader(admin.accessToken));
    const third = await request(app)
      .get("/api/admin/attractions/enrichment-pending")
      .set(authHeader(admin.accessToken));
    const fourth = await request(app)
      .get("/api/admin/attractions/enrichment-pending")
      .set(authHeader(admin.accessToken));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(fourth.status).toBe(429);
    expect(fourth.body).toEqual({
      success: false,
      message: "Too many admin enrichment requests. Please try again later.",
      data: null,
    });
  });

  test("enriches a single attraction with mocked Google Places results", async () => {
    const admin = await registerAdmin("admin-single-enrich");
    const targetAttraction = destinationAttractions[0];
    const candidate = buildCandidateFromAttraction(targetAttraction, {
      placeId: "google-place-single",
    });
    touchedAttractionIds.add(targetAttraction.id);

    jest
      .spyOn(googlePlacesClient, "textSearch")
      .mockResolvedValueOnce([candidate]);
    jest
      .spyOn(googlePlacesClient, "getPlaceDetails")
      .mockResolvedValueOnce(buildPlaceDetails(candidate));

    const response = await request(app)
      .post(`/api/admin/attractions/${targetAttraction.id}/enrich`)
      .set(authHeader(admin.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        outcome: "enriched",
        selectedPlace: expect.objectContaining({
          placeId: "google-place-single",
        }),
      })
    );

    const refreshed = await db.Attraction.findByPk(targetAttraction.id);
    expect(refreshed.externalSource).toBe("google_places");
    expect(refreshed.externalPlaceId).toBe("google-place-single");
    expect(Number(refreshed.externalReviewCount)).toBe(1234);
  });

  test("returns a mixed batch summary without calling the live Google API", async () => {
    const admin = await registerAdmin("admin-batch");
    const [first, second, third] = await db.Attraction.findAll({
      where: {
        isActive: true,
        destinationId: destinationAttractions[0].destinationId,
        externalPlaceId: null,
      },
      order: [["name", "ASC"]],
      limit: 3,
    });
    [first, second, third].forEach((attraction) => touchedAttractionIds.add(attraction.id));

    jest
      .spyOn(googlePlacesClient, "textSearch")
      .mockImplementationOnce(({ query }) =>
        Promise.resolve([buildCandidateFromQuery(query, "google-place-batch-1")])
      )
      .mockImplementationOnce(({ query }) =>
        Promise.resolve([
          buildCandidateFromQuery(query, "google-place-batch-2a"),
          buildCandidateFromQuery(query, "google-place-batch-2b"),
        ])
      )
      .mockRejectedValueOnce(new Error("Google Places text search timed out."));
    jest
      .spyOn(googlePlacesClient, "getPlaceDetails")
      .mockImplementation((placeId) =>
        Promise.resolve(
          buildPlaceDetails({
            placeId,
            name: "Google Match",
            formattedAddress: "Indonesia",
            location: null,
            rating: 4.4,
            userRatingsTotal: 1234,
            types: ["tourist_attraction"],
          })
        )
      );

    const response = await request(app)
      .post("/api/admin/attractions/enrich-missing")
      .set(authHeader(admin.accessToken))
      .send({
        destinationId: first.destinationId,
        limit: 3,
        dryRun: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        dryRun: true,
        attemptedCount: 3,
        enrichedCount: 1,
        needsReviewCount: 1,
        failedCount: 1,
      })
    );
  });

  test("backfills persisted photo URLs for enriched attractions in one destination", async () => {
    const admin = await registerAdmin("admin-photo-backfill");
    const targetAttraction = destinationAttractions[0];
    touchedAttractionIds.add(targetAttraction.id);

    await db.Attraction.update(
      {
        externalSource: "google_places",
        externalPlaceId: "google-place-photo-backfill",
        thumbnailImageUrl: null,
        mainImageUrl: null,
      },
      {
        where: {
          id: targetAttraction.id,
        },
      }
    );

    const response = await request(app)
      .post("/api/admin/attractions/backfill-photos")
      .set(authHeader(admin.accessToken))
      .send({
        destinationId: targetAttraction.destinationId,
        limit: 10,
        dryRun: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        attemptedCount: expect.any(Number),
        updatedCount: expect.any(Number),
        skippedCount: expect.any(Number),
        failedCount: 0,
      })
    );
    expect(response.body.data.updatedCount).toBeGreaterThanOrEqual(1);

    const refreshed = await db.Attraction.findByPk(targetAttraction.id);
    expect(refreshed.thumbnailImageUrl).toContain("images.unsplash.com/");
    expect(refreshed.mainImageUrl).toContain("images.unsplash.com/");
    expect(refreshed.metadata).toEqual(
      expect.objectContaining({
        assetSource: expect.objectContaining({
          provider: "unsplash",
          licenseLabel: "Unsplash License",
        }),
      })
    );
  });

  test("rate limits repeated batch enrichment runs more strictly than read requests", async () => {
    const admin = await registerAdmin("admin-rate-batch");
    const [targetAttraction] = await db.Attraction.findAll({
      where: {
        isActive: true,
        destinationId: destinationAttractions[0].destinationId,
        externalPlaceId: null,
      },
      order: [["name", "ASC"]],
      limit: 1,
    });
    touchedAttractionIds.add(targetAttraction.id);

    jest
      .spyOn(googlePlacesClient, "textSearch")
      .mockResolvedValue([
        buildCandidateFromAttraction(targetAttraction, {
          placeId: "google-place-rate-batch",
        }),
      ]);
    jest
      .spyOn(googlePlacesClient, "getPlaceDetails")
      .mockResolvedValue(
        buildPlaceDetails(
          buildCandidateFromAttraction(targetAttraction, {
            placeId: "google-place-rate-batch",
          })
        )
      );

    const first = await request(app)
      .post("/api/admin/attractions/enrich-missing")
      .set(authHeader(admin.accessToken))
      .send({
        destinationId: targetAttraction.destinationId,
        limit: 1,
        dryRun: true,
      });
    const second = await request(app)
      .post("/api/admin/attractions/enrich-missing")
      .set(authHeader(admin.accessToken))
      .send({
        destinationId: targetAttraction.destinationId,
        limit: 1,
        dryRun: true,
      });

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({
      success: false,
      message: "Too many admin batch enrichment requests. Please try again later.",
      data: null,
    });
  });

  test("returns 409 when the selected Google place is already attached elsewhere", async () => {
    const admin = await registerAdmin("admin-duplicate-place");
    const sourceAttraction = destinationAttractions[0];
    const targetAttraction = destinationAttractions[1];
    const duplicatePlaceId = "google-place-duplicate";
    touchedAttractionIds.add(sourceAttraction.id);
    touchedAttractionIds.add(targetAttraction.id);

    await db.Attraction.update(
      {
        externalSource: "google_places",
        externalPlaceId: duplicatePlaceId,
        externalRating: 4.5,
        externalReviewCount: 900,
      },
      {
        where: {
          id: sourceAttraction.id,
        },
      }
    );

    const candidate = buildCandidateFromAttraction(targetAttraction, {
      placeId: duplicatePlaceId,
    });

    jest
      .spyOn(googlePlacesClient, "textSearch")
      .mockResolvedValueOnce([candidate]);
    jest
      .spyOn(googlePlacesClient, "getPlaceDetails")
      .mockResolvedValueOnce(buildPlaceDetails(candidate));

    const response = await request(app)
      .post(`/api/admin/attractions/${targetAttraction.id}/enrich`)
      .set(authHeader(admin.accessToken));

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "This Google place is already attached to another attraction."
    );
  });
});
