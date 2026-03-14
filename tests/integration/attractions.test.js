const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");
const { loadSeedData } = require("./helpers/seed-data");
const { googlePlacesClient } = require("../../src/services/google-places");

let seedData;

const countDestinationAttractions = (destinationId) =>
  Object.values(seedData.attractions).filter(
    (attraction) => attraction.destinationId === destinationId
  ).length;

beforeAll(async () => {
  await ensureTestDbReady();
  seedData = await loadSeedData();
});

afterEach(() => {
  jest.restoreAllMocks();
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
        openingHours: expect.any(Object),
        rating: expect.anything(),
        thumbnailImageUrl: expect.stringContaining("/api/attractions/"),
        mainImageUrl: expect.stringContaining("/api/attractions/"),
        primaryPreference: expect.objectContaining({
          slug: expect.stringMatching(/^(popular|food|shopping|history)$/),
          name: expect.stringMatching(/^(Populer|Makanan|Belanja|Sejarah)$/),
        }),
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

  test("GET /api/destinations/:destinationId/attractions also accepts a destination slug", async () => {
    const response = await request(app).get("/api/destinations/batam/attractions");

    expect(response.status).toBe(200);
    expect(response.body.data.destination).toEqual(
      expect.objectContaining({
        slug: "batam",
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

  test("returns 404 for an unknown destination slug", async () => {
    const response = await request(app).get(
      "/api/destinations/not-a-real-destination/attractions"
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Destination not found.");
  });

  test("searches attractions within a destination using q", async () => {
    const response = await request(app)
      .get("/api/destinations/batam/attractions")
      .query({
        q: "nongsa",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.destination.slug).toBe("batam");
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(
      response.body.data.items.every((item) =>
        ["name", "slug", "fullAddress"].some((field) =>
          String(item[field] || "").toLowerCase().includes("nongsa")
        )
      )
    ).toBe(true);
  });

  test("search keeps pagination metadata stable", async () => {
    const firstPageResponse = await request(app)
      .get("/api/destinations/batam/attractions")
      .query({
        q: "batam",
        page: 1,
        limit: 2,
      });

    expect(firstPageResponse.status).toBe(200);
    expect(firstPageResponse.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 2,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      })
    );

    const lastPage = Math.max(firstPageResponse.body.meta.totalPages, 1);
    const lastPageResponse = await request(app)
      .get("/api/destinations/batam/attractions")
      .query({
        q: "batam",
        page: lastPage,
        limit: 2,
      });

    expect(lastPageResponse.status).toBe(200);
    expect(lastPageResponse.body.meta).toEqual({
      page: lastPage,
      limit: 2,
      total: firstPageResponse.body.meta.total,
      totalPages: firstPageResponse.body.meta.totalPages,
    });
  });

  test("returns an empty result cleanly for an unknown search term", async () => {
    const response = await request(app)
      .get("/api/destinations/batam/attractions")
      .query({
        q: "zzzz-no-match-term",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.destination.slug).toBe("batam");
    expect(response.body.data.items).toEqual([]);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
    });
  });

  test("GET /api/attractions/:idOrSlug fetches a detailed attraction by slug", async () => {
    const response = await request(app).get("/api/attractions/tanah-lot");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        slug: "tanah-lot",
        shortLocation: expect.any(String),
        thumbnailImageUrl: expect.stringContaining("/api/attractions/"),
        mainImageUrl: expect.stringContaining("/api/attractions/"),
        photos: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining("/api/attractions/"),
            type: expect.stringMatching(/^(main|thumbnail)$/),
          }),
        ]),
        openingHours: expect.any(Object),
        destination: expect.objectContaining({
          slug: "bali",
        }),
        primaryPreference: expect.objectContaining({
          slug: expect.stringMatching(/^(popular|food|shopping|history)$/),
          name: expect.stringMatching(/^(Populer|Makanan|Belanja|Sejarah)$/),
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
    expect(response.body.data.photos.length).toBeLessThanOrEqual(4);
    expect(new Set(response.body.data.photos.map((photo) => photo.url)).size).toBe(
      response.body.data.photos.length
    );
  });

  test("GET /api/attractions/:idOrSlug returns 404 for unknown slugs", async () => {
    const response = await request(app).get("/api/attractions/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Attraction not found.");
  });

  test("GET /api/attractions/:idOrSlug/photo streams a Google photo when a confident match is found", async () => {
    const targetAttraction = seedData.attractions["tanah-lot"];

    jest.spyOn(googlePlacesClient, "textSearch").mockResolvedValueOnce([
      {
        placeId: "google-photo-place",
        name: targetAttraction.name,
        formattedAddress: targetAttraction.fullAddress,
        location: {
          latitude: Number(targetAttraction.latitude),
          longitude: Number(targetAttraction.longitude),
        },
        rating: 4.6,
        userRatingsTotal: 1234,
        types: ["tourist_attraction"],
      },
    ]);
    jest.spyOn(googlePlacesClient, "getPlaceDetails").mockResolvedValueOnce({
      placeId: "google-photo-place",
      photos: [
        {
          photoReference: "photo-ref-1",
        },
      ],
    });
    jest.spyOn(googlePlacesClient, "getPlacePhoto").mockResolvedValueOnce({
      body: Buffer.from("jpeg-bytes"),
      contentType: "image/jpeg",
    });

    const response = await request(app)
      .get(`/api/attractions/${targetAttraction.id}/photo`)
      .query({ variant: "thumbnail" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image/jpeg");
    expect(googlePlacesClient.textSearch).toHaveBeenCalledTimes(1);
    expect(googlePlacesClient.getPlaceDetails).toHaveBeenCalledWith(
      "google-photo-place",
      { includePhotos: true }
    );
    expect(googlePlacesClient.getPlacePhoto).toHaveBeenCalledWith({
      photoReference: "photo-ref-1",
      maxWidth: 640,
    });
  });

  test("GET /api/attractions/:idOrSlug/photo falls back to the destination hero image when no match exists", async () => {
    const targetAttraction = seedData.attractions["tanah-lot"];
    const destination = seedData.destinations.bali;

    jest.spyOn(googlePlacesClient, "textSearch").mockResolvedValueOnce([]);

    const response = await request(app)
      .get(`/api/attractions/${targetAttraction.id}/photo`)
      .query({ variant: "main" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(destination.heroImageUrl);
  });
});
