const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");
const { loadSeedData } = require("./helpers/seed-data");

let seedData;

const countDestinationAttractions = (destinationId) =>
  Object.values(seedData.attractions).filter(
    (attraction) => attraction.destinationId === destinationId
  ).length;

beforeAll(async () => {
  await ensureTestDbReady();
  seedData = await loadSeedData();
});

afterAll(async () => {
  await closeTestDb();
});

describe("attractions integration", () => {
  test("GET /api/destinations/:destinationId/attractions returns the destination catalog", async () => {
    const batamAttractionCount = countDestinationAttractions(seedData.destinations.batam.id);
    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.batam.id}/attractions`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 12,
      total: batamAttractionCount,
      totalPages: Math.ceil(batamAttractionCount / 12),
    });
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
        thumbnailImageUrl: null,
        mainImageUrl: null,
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

  test("paginates destination attractions with stable metadata", async () => {
    const baliAttractionCount = countDestinationAttractions(seedData.destinations.bali.id);
    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      page: 2,
      limit: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 2,
      total: baliAttractionCount,
      totalPages: Math.ceil(baliAttractionCount / 2),
    });
    expect(response.body.data.items).toHaveLength(2);
  });

  test("returns correct attraction pagination metadata on the last page", async () => {
    const baliAttractionCount = countDestinationAttractions(seedData.destinations.bali.id);
    const lastPage = Math.ceil(baliAttractionCount / 2);
    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      page: lastPage,
      limit: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: lastPage,
      limit: 2,
      total: baliAttractionCount,
      totalPages: lastPage,
    });
    expect(response.body.data.items).toHaveLength(2);
  });

  test("filters attractions by a single category", async () => {
    const beachCategoryId = seedData.attractionCategories.beach.id;

    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      categoryIds: beachCategoryId,
      page: 1,
      limit: 1,
    });

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 1,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      })
    );
    expect(response.body.data.items.length).toBe(1);
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
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 12,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      })
    );
    expect(
      response.body.data.items.every((item) =>
        item.categories.some((category) =>
          ["beach", "temple"].includes(category.slug)
        )
      )
    ).toBe(true);
  });

  test("keeps filtered attraction pagination metadata stable through the last page", async () => {
    const beachCategoryId = seedData.attractionCategories.beach.id;
    const firstPageResponse = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      categoryIds: beachCategoryId,
      page: 1,
      limit: 1,
    });

    expect(firstPageResponse.status).toBe(200);
    expect(firstPageResponse.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 1,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      })
    );
    expect(firstPageResponse.body.meta.total).toBeGreaterThan(0);

    const lastPage = Math.max(firstPageResponse.body.meta.totalPages, 1);
    const lastPageResponse = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      categoryIds: beachCategoryId,
      page: lastPage,
      limit: 1,
    });

    expect(lastPageResponse.status).toBe(200);
    expect(lastPageResponse.body.meta).toEqual({
      page: lastPage,
      limit: 1,
      total: firstPageResponse.body.meta.total,
      totalPages: firstPageResponse.body.meta.totalPages,
    });
    expect(lastPageResponse.body.data.items.length).toBeGreaterThan(0);
    expect(lastPageResponse.body.data.items.length).toBeLessThanOrEqual(1);
    expect(
      lastPageResponse.body.data.items.every((item) =>
        item.categories.some((category) => category.slug === "beach")
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

  test("rejects invalid pagination query params", async () => {
    const response = await request(app).get(
      `/api/destinations/${seedData.destinations.bali.id}/attractions`
    ).query({
      page: 0,
      limit: 0,
    });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "page" }),
        expect.objectContaining({ path: "limit" }),
      ])
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
