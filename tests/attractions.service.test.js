process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createAttractionsService } = require("../src/modules/attractions/attractions.service");

describe("attractions service", () => {
  test("listByDestination rejects unknown category filters", async () => {
    const destinationId = "22222222-2222-4222-8222-222222222222";
    const db = {
      Destination: {
        findByPk: jest.fn().mockResolvedValue({
          id: destinationId,
          name: "Batam",
          slug: "batam",
          isActive: true,
        }),
      },
      Attraction: {
        findAll: jest.fn(),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
    });

    await expect(
      attractionsService.listByDestination(destinationId, [
        "77777777-7777-4777-8777-777777777777",
      ])
    ).rejects.toMatchObject({
      message: "One or more attraction categories do not exist.",
      statusCode: 422,
    });
  });
});
