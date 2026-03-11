process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createDashboardService } = require("../src/modules/dashboard/dashboard.service");

describe("dashboard service", () => {
  test("getHome returns Batam-first featured and explore-more cards ordered by popularity", async () => {
    const destination = {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Batam",
      slug: "batam",
      isActive: true,
      description: "Batam",
      destinationType: "city",
      countryCode: "ID",
      countryName: "Indonesia",
      provinceName: "Kepulauan Riau",
      cityName: "Batam",
      regionName: "Riau Islands",
      heroImageUrl: null,
      metadata: {},
    };
    const attractions = [
      {
        id: "1",
        destinationId: destination.id,
        name: "Seafood Strip",
        slug: "seafood-strip",
        fullAddress: "Harbour Bay, Batam, Kepulauan Riau",
        thumbnailImageUrl: null,
        rating: "4.1",
        externalRating: 4.8,
        externalReviewCount: 5000,
      },
      {
        id: "2",
        destinationId: destination.id,
        name: "Nagoya Mall",
        slug: "nagoya-mall",
        fullAddress: "Lubuk Baja, Batam, Kepulauan Riau",
        thumbnailImageUrl: null,
        rating: "4.5",
        externalRating: null,
        externalReviewCount: null,
      },
      {
        id: "3",
        destinationId: destination.id,
        name: "Temple Gate",
        slug: "temple-gate",
        fullAddress: "Nagoya, Batam, Kepulauan Riau",
        thumbnailImageUrl: null,
        rating: "4.4",
        externalRating: 4.3,
        externalReviewCount: 600,
      },
    ];
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(destination),
      },
      Attraction: {
        findAll: jest.fn().mockResolvedValue(attractions),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([
          { id: "cat-food", slug: "culinary", name: "Culinary" },
          { id: "cat-shopping", slug: "shopping", name: "Shopping" },
          { id: "cat-temple", slug: "temple", name: "Temple" },
        ]),
      },
      AttractionCategoryMapping: {
        findAll: jest.fn().mockResolvedValue([
          { attractionId: "1", attractionCategoryId: "cat-food" },
          { attractionId: "2", attractionCategoryId: "cat-shopping" },
          { attractionId: "3", attractionCategoryId: "cat-temple" },
        ]),
      },
    };
    const dashboardService = createDashboardService({
      dbProvider: () => db,
    });

    const result = await dashboardService.getHome();

    expect(db.Destination.findOne).toHaveBeenCalledWith({
      where: { slug: "batam" },
    });
    expect(db.Attraction.findAll).toHaveBeenCalledWith({
      where: {
        destinationId: destination.id,
        isActive: true,
      },
      order: [["name", "ASC"]],
    });
    expect(result.destination).toEqual(expect.objectContaining({ slug: "batam" }));
    expect(result.featured.map((item) => item.slug)).toEqual([
      "seafood-strip",
      "temple-gate",
      "nagoya-mall",
    ]);
    expect(result.featured[0]).toEqual(
      expect.objectContaining({
        shortLocation: "Harbour Bay, Batam",
        badge: "Makanan",
        badgeKey: "food",
        rating: 4.8,
        thumbnailImageUrl: null,
      })
    );
    expect(result.featured[1]).toEqual(
      expect.objectContaining({
        badge: "Sejarah",
        badgeKey: "history",
      })
    );
    expect(result.featured[2]).toEqual(
      expect.objectContaining({
        badge: "Belanja",
        badgeKey: "shopping",
      })
    );
    expect(result.exploreMore).toEqual([]);
    expect(result.meta).toEqual({
      defaultDestinationSlug: "batam",
      featuredCount: 3,
      exploreMoreCount: 0,
    });
  });

  test("getHome rejects an unavailable default dashboard destination", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(null),
      },
      Attraction: {
        findAll: jest.fn(),
      },
    };
    const dashboardService = createDashboardService({
      dbProvider: () => db,
    });

    await expect(dashboardService.getHome()).rejects.toMatchObject({
      message: "Dashboard destination is not available.",
      statusCode: 500,
    });
  });
});
