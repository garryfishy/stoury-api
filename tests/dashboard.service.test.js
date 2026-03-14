process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createDashboardService } = require("../src/modules/dashboard/dashboard.service");

const createDestination = (overrides = {}) => ({
  id: overrides.id || "22222222-2222-4222-8222-222222222222",
  name: overrides.name || "Batam",
  slug: overrides.slug || "batam",
  isActive: overrides.isActive ?? true,
  description: overrides.description || overrides.name || "Destination",
  destinationType: "city",
  countryCode: "ID",
  countryName: "Indonesia",
  provinceName: "Kepulauan Riau",
  cityName: overrides.cityName || overrides.name || "Batam",
  regionName: "Riau Islands",
  heroImageUrl: null,
  metadata: {},
});

const createAttraction = (overrides = {}) => ({
  id: overrides.id,
  destinationId: overrides.destinationId,
  name: overrides.name,
  slug: overrides.slug,
  fullAddress: overrides.fullAddress,
  thumbnailImageUrl: null,
  rating: overrides.rating ?? "4.0",
  externalRating: overrides.externalRating ?? null,
  externalReviewCount: overrides.externalReviewCount ?? null,
  isActive: true,
});

describe("dashboard service", () => {
  test("getHome returns 4 randomized cards from the global top-20 active pool", async () => {
    const batam = createDestination({});
    const yogya = createDestination({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Yogyakarta",
      slug: "yogyakarta",
      cityName: "Yogyakarta",
    });
    const destinations = [batam, yogya];
    const attractions = Array.from({ length: 25 }, (_, index) =>
      createAttraction({
        id: String(index + 1),
        destinationId: index % 2 === 0 ? batam.id : yogya.id,
        name: `Attraction ${String(index + 1).padStart(2, "0")}`,
        slug: `attraction-${index + 1}`,
        fullAddress:
          index % 2 === 0
            ? `District ${index + 1}, Batam, Kepulauan Riau`
            : `Area ${index + 1}, Yogyakarta, DI Yogyakarta`,
        externalRating: 4.9 - index * 0.01,
        externalReviewCount: 5000 - index * 100,
      })
    );
    const db = {
      Destination: {
        findAll: jest.fn().mockResolvedValue(destinations),
      },
      Attraction: {
        findAll: jest.fn().mockResolvedValue(attractions),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      AttractionCategoryMapping: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const dashboardService = createDashboardService({
      dbProvider: () => db,
      randomFn: () => 0,
    });

    const result = await dashboardService.getHome();

    expect(db.Destination.findAll).toHaveBeenCalledWith({
      where: { isActive: true },
      order: [["name", "ASC"]],
    });
    expect(result.featured).toHaveLength(4);
    expect(result.meta).toEqual({
      featuredCount: 4,
      candidatePoolSize: 20,
      totalActiveAttractionCount: 25,
    });
    expect(result.featured.every((item) => item.destination?.slug)).toBe(true);
    expect(result.featured.map((item) => item.slug)).toEqual([
      "attraction-2",
      "attraction-3",
      "attraction-4",
      "attraction-5",
    ]);
  });

  test("getHome rejects when there are no active destinations", async () => {
    const db = {
      Destination: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      Attraction: {
        findAll: jest.fn(),
      },
    };
    const dashboardService = createDashboardService({
      dbProvider: () => db,
    });

    await expect(dashboardService.getHome()).rejects.toMatchObject({
      message: "No active destinations are available for the dashboard.",
      statusCode: 500,
    });
  });

  test("searchAttractions searches globally across active destinations and ranks by popularity", async () => {
    const batam = createDestination({});
    const yogya = createDestination({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Yogyakarta",
      slug: "yogyakarta",
      cityName: "Yogyakarta",
    });
    const attractions = [
      createAttraction({
        id: "1",
        destinationId: batam.id,
        name: "Batam Night Market",
        slug: "batam-night-market",
        fullAddress: "Nagoya, Batam, Kepulauan Riau",
        externalRating: 4.7,
        externalReviewCount: 3000,
      }),
      createAttraction({
        id: "2",
        destinationId: yogya.id,
        name: "Malioboro Night Market",
        slug: "malioboro-night-market",
        fullAddress: "Malioboro, Yogyakarta, DI Yogyakarta",
        externalRating: 4.8,
        externalReviewCount: 4000,
      }),
    ];
    const db = {
      Destination: {
        findAll: jest.fn().mockResolvedValue([batam, yogya]),
      },
      Attraction: {
        findAll: jest.fn().mockResolvedValue(attractions),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      AttractionCategoryMapping: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const dashboardService = createDashboardService({
      dbProvider: () => db,
    });

    const result = await dashboardService.searchAttractions({
      q: "night market",
      page: 1,
      limit: 10,
    });

    expect(result.query).toBe("night market");
    expect(result.items.map((item) => item.slug)).toEqual([
      "malioboro-night-market",
      "batam-night-market",
    ]);
    expect(result.items[0].destination).toEqual(
      expect.objectContaining({
        slug: "yogyakarta",
      })
    );
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });
});
