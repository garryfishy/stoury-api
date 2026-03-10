const { closeTestDb, db, ensureTestDbReady } = require("./helpers/db");

beforeAll(async () => {
  await ensureTestDbReady();
});

afterAll(async () => {
  await closeTestDb();
});

describe("curated attraction catalog floor", () => {
  test("each active destination has at least 20 active attractions", async () => {
    const destinations = await db.Destination.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    });

    for (const destination of destinations) {
      const attractionCount = await db.Attraction.count({
        where: {
          destinationId: destination.id,
          isActive: true,
        },
      });

      expect(attractionCount).toBeGreaterThanOrEqual(20);
    }
  });
});
