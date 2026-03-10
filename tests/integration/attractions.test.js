const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");
const { loadSeedData } = require("./helpers/seed-data");

let seedData;

beforeAll(async () => {
  await ensureTestDbReady();
  seedData = await loadSeedData();
});

afterAll(async () => {
  await closeTestDb();
});

describe("attractions integration", () => {
  test("GET /api/destinations/:destinationId/attractions returns the destination catalog", async () => {
    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.batam.id}/attractions`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.destination).toEqual(
      expect.objectContaining({
        id: seedData.destinations.batam.id,
        slug: "batam",
      })
    );
    expect(response.body.data.items.length).toBeGreaterThanOrEqual(5);
    expect(response.body.data.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        slug: expect.any(String),
        description: expect.any(String),
        fullAddress: expect.any(String),
        latitude: expect.anything(),
        longitude: expect.anything(),
        estimatedDurationMinutes: expect.any(Number),
        rating: expect.anything(),
        thumbnailImageUrl: expect.any(String),
        categories: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            slug: expect.any(String),
          }),
        ]),
      })
    );
  });

  test("filters attractions by a single category", async () => {
    const beachCategoryId = seedData.attractionCategories.beach.id;

    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      categoryIds: beachCategoryId,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(
      response.body.data.items.every((item) =>
        item.categories.some((category) => category.slug === "beach")
      )
    ).toBe(true);
  });

  test("filters attractions by multiple categories", async () => {
    const beachCategoryId = seedData.attractionCategories.beach.id;
    const templeCategoryId = seedData.attractionCategories.temple.id;

    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      categoryIds: `${beachCategoryId},${templeCategoryId}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(
      response.body.data.items.every((item) =>
        item.categories.some((category) =>
          ["beach", "temple"].includes(category.slug)
        )
      )
    ).toBe(true);
  });

  test("rejects unknown attraction category IDs", async () => {
    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      categoryIds: "11111111-1111-4111-8111-111111111111",
    });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe(
      "One or more attraction categories do not exist."
    );
  });

  test("rejects invalid destination UUIDs", async () => {
    const response = await request(app).get(
      "/api/destinations/not-a-uuid/attractions"
    );

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "destinationId" }),
      ])
    );
  });

  test("GET /api/attractions/:idOrSlug fetches a detailed attraction by slug", async () => {
    const response = await request(app).get("/api/attractions/tanah-lot");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        slug: "tanah-lot",
        destination: expect.objectContaining({
          slug: "bali",
        }),
        categories: expect.arrayContaining([
          expect.objectContaining({ slug: "beach" }),
          expect.objectContaining({ slug: "temple" }),
        ]),
        enrichment: {
          externalSource: null,
          externalPlaceId: null,
          externalRating: null,
          externalReviewCount: null,
          externalLastSyncedAt: null,
        },
      })
    );
  });

  test("GET /api/attractions/:idOrSlug returns 404 for unknown slugs", async () => {
    const response = await request(app).get("/api/attractions/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Attraction not found.");
  });
});
