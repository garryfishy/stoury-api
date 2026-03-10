const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");
const {
  restoreDestinationStates,
  setDestinationActiveState,
} = require("./helpers/destination-state");
const { loadSeedData } = require("./helpers/seed-data");

let seedData;

beforeAll(async () => {
  await ensureTestDbReady();
  seedData = await loadSeedData();
});

afterEach(async () => {
  seedData = await restoreDestinationStates();
});

afterAll(async () => {
  seedData = await restoreDestinationStates();
  await closeTestDb();
});

describe("destinations integration", () => {
  test("GET /api/destinations returns the seeded destinations in sort order", async () => {
    const response = await request(app).get("/api/destinations");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data.map((destination) => destination.slug)).toEqual([
      "batam",
      "yogyakarta",
      "bali",
    ]);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Batam",
        slug: "batam",
        isActive: expect.any(Boolean),
        description: expect.any(String),
        destinationType: "city",
        heroImageUrl: expect.any(String),
      })
    );
    expect(response.body.data[2]).toEqual(
      expect.objectContaining({
        name: "Bali",
        destinationType: "region",
      })
    );
  });

  test("GET /api/destinations paginates with page and limit metadata", async () => {
    const response = await request(app)
      .get("/api/destinations")
      .query({ page: 2, limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].slug).toBe("yogyakarta");
  });

  test("GET /api/destinations returns correct metadata on the last page", async () => {
    const response = await request(app)
      .get("/api/destinations")
      .query({ page: 3, limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 3,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].slug).toBe("bali");
  });

  test("GET /api/destinations/:idOrSlug fetches a destination by slug", async () => {
    const response = await request(app).get("/api/destinations/batam");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Batam",
        slug: "batam",
        isActive: expect.any(Boolean),
      })
    );
  });

  test("GET /api/destinations/:idOrSlug fetches a destination by UUID", async () => {
    const listResponse = await request(app).get("/api/destinations");
    const batamId = listResponse.body.data.find(
      (destination) => destination.slug === "batam"
    ).id;

    const response = await request(app).get(`/api/destinations/${batamId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: batamId,
        slug: "batam",
        isActive: expect.any(Boolean),
      })
    );
  });

  test("GET /api/destinations keeps inactive destinations in the catalog", async () => {
    seedData = await setDestinationActiveState("yogyakarta", false);

    const response = await request(app).get("/api/destinations");
    const yogyakarta = response.body.data.find(
      (destination) => destination.slug === "yogyakarta"
    );

    expect(response.status).toBe(200);
    expect(yogyakarta).toEqual(
      expect.objectContaining({
        slug: "yogyakarta",
        isActive: false,
      })
    );
  });

  test("GET /api/destinations/:idOrSlug returns inactive destinations too", async () => {
    seedData = await setDestinationActiveState("yogyakarta", false);

    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.yogyakarta.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: seedData.destinations.yogyakarta.id,
        slug: "yogyakarta",
        isActive: false,
      })
    );
  });

  test.each([
    "/api/destinations/not-a-real-destination",
    "/api/destinations/11111111-1111-4111-8111-111111111111",
  ])("GET %s returns 404 when the destination is missing", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Destination not found.");
  });
});
