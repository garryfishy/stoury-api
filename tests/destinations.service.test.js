process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createDestinationsService } = require("../src/modules/destinations/destinations.service");

describe("destinations service", () => {
  test("listDestinations serializes destinations with activation state and pagination metadata", async () => {
    const db = {
      Destination: {
        findAndCountAll: jest.fn().mockResolvedValue({
          count: 1,
          rows: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              name: "Batam",
              slug: "batam",
              isActive: false,
              description: "Weekend city",
              destinationType: "city",
              countryCode: "ID",
              countryName: "Indonesia",
              provinceName: "Riau Islands",
              cityName: "Batam",
              regionName: null,
              heroImageUrl: null,
              metadata: {},
            },
          ],
        }),
      },
    };
    const destinationsService = createDestinationsService({
      dbProvider: () => db,
    });

    const result = await destinationsService.listDestinations();

    expect(result).toEqual({
      items: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Batam",
          slug: "batam",
          isActive: false,
          description: "Weekend city",
          destinationType: "city",
          countryCode: "ID",
          countryName: "Indonesia",
          provinceName: "Riau Islands",
          cityName: "Batam",
          regionName: null,
          heroImageUrl: null,
          metadata: {},
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    expect(db.Destination.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0,
      })
    );
  });

  test("getDestination rejects missing destinations", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    };
    const destinationsService = createDestinationsService({
      dbProvider: () => db,
    });

    await expect(destinationsService.getDestination("batam")).rejects.toMatchObject({
      message: "Destination not found.",
      statusCode: 404,
    });
  });

  test("getDestination returns inactive destinations too", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          name: "Yogyakarta",
          slug: "yogyakarta",
          isActive: false,
          description: "Culture city",
          destinationType: "city",
          countryCode: "ID",
          countryName: "Indonesia",
          provinceName: "DI Yogyakarta",
          cityName: "Yogyakarta",
          regionName: null,
          heroImageUrl: null,
          metadata: {},
        }),
      },
    };
    const destinationsService = createDestinationsService({
      dbProvider: () => db,
    });

    const result = await destinationsService.getDestination("yogyakarta");

    expect(result).toEqual(
      expect.objectContaining({
        slug: "yogyakarta",
        isActive: false,
      })
    );
  });
});
