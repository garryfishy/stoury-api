process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createDestinationsService } = require("../src/modules/destinations/destinations.service");

describe("destinations service", () => {
  test("listDestinations serializes active destinations", async () => {
    const db = {
      Destination: {
        findAll: jest.fn().mockResolvedValue([
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Batam",
            slug: "batam",
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
        ]),
      },
    };
    const destinationsService = createDestinationsService({
      dbProvider: () => db,
    });

    const result = await destinationsService.listDestinations();

    expect(result).toEqual([
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Batam",
        slug: "batam",
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
    ]);
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
});
