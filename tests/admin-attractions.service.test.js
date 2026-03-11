process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { Op } = require("sequelize");

const {
  createAdminAttractionsService,
} = require("../src/modules/admin-attractions/admin-attractions.service");

const destination = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Batam",
  slug: "batam",
  countryName: "Indonesia",
};

const createAttractionRecord = (overrides = {}) => ({
  id: "33333333-3333-4333-8333-333333333333",
  destinationId: destination.id,
  name: "Pantai Nongsa",
  slug: "pantai-nongsa",
  latitude: "1.1870",
  longitude: "104.1190",
  externalSource: null,
  externalPlaceId: null,
  externalRating: null,
  externalReviewCount: null,
  externalLastSyncedAt: null,
  enrichmentStatus: "pending",
  enrichmentError: null,
  enrichmentAttemptedAt: null,
  update: jest.fn().mockImplementation(function update(values) {
    Object.assign(this, values);
    return Promise.resolve(this);
  }),
  ...overrides,
});

const buildDb = (
  attractionRecord,
  duplicateRecord = null,
  { countResult = 0, listResults = [] } = {}
) => ({
  Attraction: {
    rawAttributes: {
      enrichmentStatus: {},
      enrichmentError: {},
      enrichmentAttemptedAt: {},
    },
    count: jest.fn().mockResolvedValue(countResult),
    findByPk: jest.fn().mockResolvedValue(attractionRecord),
    findOne: jest.fn().mockResolvedValue(duplicateRecord),
    findAll: jest.fn().mockResolvedValue(listResults),
  },
  Destination: {
    findByPk: jest.fn().mockResolvedValue(destination),
    findAll: jest.fn().mockResolvedValue([destination]),
  },
});

describe("admin attractions service", () => {
  test("listPendingEnrichment returns total-backed pagination metadata", async () => {
    const attractionRecord = createAttractionRecord();
    const db = buildDb(attractionRecord, null, {
      countResult: 3,
      listResults: [attractionRecord],
    });
    const service = createAdminAttractionsService({
      dbProvider: () => db,
      googlePlacesClient: {},
    });

    const result = await service.listPendingEnrichment({
      destinationId: destination.id,
      page: 2,
      limit: 1,
      staleOnly: false,
      staleDays: 30,
    });

    expect(db.Attraction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          destinationId: destination.id,
          enrichmentStatus: "pending",
          isActive: true,
        }),
      })
    );
    expect(db.Attraction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1,
        offset: 1,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
    expect(result.total).toBe(3);
    expect(result.filtersApplied).toEqual({
      destinationId: destination.id,
      status: "pending",
      page: 2,
      limit: 1,
      staleOnly: false,
      staleDays: 30,
    });
  });

  test("listPendingEnrichment allows stale-only queries without forcing pending status", async () => {
    const attractionRecord = createAttractionRecord();
    const db = buildDb(attractionRecord, null, {
      countResult: 0,
      listResults: [],
    });
    const service = createAdminAttractionsService({
      dbProvider: () => db,
      googlePlacesClient: {},
    });

    const result = await service.listPendingEnrichment({
      page: 1,
      limit: 5,
      staleOnly: true,
      staleDays: 30,
    });

    const countWhere = db.Attraction.count.mock.calls[0][0].where;

    expect(countWhere.enrichmentStatus).toBeUndefined();
    expect(countWhere[Op.and]).toHaveLength(1);
    expect(result.filtersApplied.status).toBeNull();
  });

  test("enrichAttraction saves a confident Google Places match", async () => {
    const attractionRecord = createAttractionRecord();
    const db = buildDb(attractionRecord);
    const googlePlacesClient = {
      textSearch: jest.fn().mockResolvedValue([
        {
          placeId: "google-place-1",
          name: "Pantai Nongsa",
          formattedAddress: "Nongsa, Batam City, Indonesia",
          location: {
            latitude: 1.1871,
            longitude: 104.1191,
          },
          rating: 4.4,
          userRatingsTotal: 1234,
          types: ["tourist_attraction"],
        },
      ]),
      getPlaceDetails: jest.fn().mockResolvedValue({
        placeId: "google-place-1",
        name: "Pantai Nongsa",
        formattedAddress: "Nongsa, Batam City, Indonesia",
        location: {
          latitude: 1.1871,
          longitude: 104.1191,
        },
        rating: 4.4,
        userRatingsTotal: 1234,
        types: ["tourist_attraction"],
        url: "https://maps.google.com/?cid=123",
        websiteUri: null,
      }),
    };
    const service = createAdminAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    const result = await service.enrichAttraction(attractionRecord.id);

    expect(result.outcome).toBe("enriched");
    expect(result.selectedPlace).toEqual(
      expect.objectContaining({
        placeId: "google-place-1",
        rating: 4.4,
      })
    );
    expect(attractionRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        externalSource: "google_places",
        externalPlaceId: "google-place-1",
        enrichmentStatus: "enriched",
      }),
      { transaction: null }
    );
    expect(result.attraction.enrichment).toEqual(
      expect.objectContaining({
        status: "enriched",
        externalPlaceId: "google-place-1",
      })
    );
  });

  test("enrichAttraction marks ambiguous matches as needs_review", async () => {
    const attractionRecord = createAttractionRecord();
    const db = buildDb(attractionRecord);
    const googlePlacesClient = {
      textSearch: jest.fn().mockResolvedValue([
        {
          placeId: "google-place-1",
          name: "Pantai Nongsa",
          formattedAddress: "Nongsa, Batam City, Indonesia",
          location: {
            latitude: 1.1871,
            longitude: 104.1191,
          },
          rating: 4.4,
          userRatingsTotal: 1234,
          types: ["tourist_attraction"],
        },
        {
          placeId: "google-place-2",
          name: "Pantai Nongsa",
          formattedAddress: "Nongsa, Batam City, Indonesia",
          location: {
            latitude: 1.1872,
            longitude: 104.1192,
          },
          rating: 4.3,
          userRatingsTotal: 1100,
          types: ["lodging", "tourist_attraction"],
        },
      ]),
      getPlaceDetails: jest.fn(),
    };
    const service = createAdminAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    const result = await service.enrichAttraction(attractionRecord.id);

    expect(result.outcome).toBe("needs_review");
    expect(result.candidateCount).toBe(2);
    expect(result.selectedPlace).toBeNull();
    expect(googlePlacesClient.getPlaceDetails).not.toHaveBeenCalled();
    expect(attractionRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        enrichmentStatus: "needs_review",
        enrichmentError: null,
      }),
      { transaction: null }
    );
  });

  test("enrichAttraction marks upstream lookup failures as failed", async () => {
    const attractionRecord = createAttractionRecord();
    const db = buildDb(attractionRecord);
    const googlePlacesClient = {
      textSearch: jest
        .fn()
        .mockRejectedValue(new Error("Google Places text search timed out.")),
      getPlaceDetails: jest.fn(),
    };
    const service = createAdminAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    const result = await service.enrichAttraction(attractionRecord.id);

    expect(result.outcome).toBe("failed");
    expect(result.error).toBe("Google Places text search timed out.");
    expect(attractionRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        enrichmentStatus: "failed",
        enrichmentError: "Google Places text search timed out.",
      }),
      { transaction: null }
    );
  });

  test("enrichAttraction rejects duplicate Google place conflicts", async () => {
    const attractionRecord = createAttractionRecord();
    const db = buildDb(attractionRecord, {
      id: "99999999-9999-4999-8999-999999999999",
      externalSource: "google_places",
      externalPlaceId: "google-place-1",
    });
    const googlePlacesClient = {
      textSearch: jest.fn().mockResolvedValue([
        {
          placeId: "google-place-1",
          name: "Pantai Nongsa",
          formattedAddress: "Nongsa, Batam City, Indonesia",
          location: {
            latitude: 1.1871,
            longitude: 104.1191,
          },
          rating: 4.4,
          userRatingsTotal: 1234,
          types: ["tourist_attraction"],
        },
      ]),
      getPlaceDetails: jest.fn().mockResolvedValue({
        placeId: "google-place-1",
        name: "Pantai Nongsa",
        formattedAddress: "Nongsa, Batam City, Indonesia",
        location: {
          latitude: 1.1871,
          longitude: 104.1191,
        },
        rating: 4.4,
        userRatingsTotal: 1234,
        types: ["tourist_attraction"],
      }),
    };
    const service = createAdminAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    await expect(service.enrichAttraction(attractionRecord.id)).rejects.toMatchObject({
      message: "This Google place is already attached to another attraction.",
      statusCode: 409,
    });
  });
});
