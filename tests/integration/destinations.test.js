const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");

beforeAll(async () => {
  await ensureTestDbReady();
});

afterAll(async () => {
  await closeTestDb();
});

describe("destinations integration", () => {
  test("GET /api/destinations returns the seeded destinations in sort order", async () => {
    const response = await request(app).get("/api/destinations");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data.map((destination) => destination.slug)).toEqual([
      "batam",
      "yogyakarta",
      "bali",
    ]);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Batam",
        slug: "batam",
        description: expect.any(String),
        destinationType: "city",
        heroImageUrl: expect.any(String),
      })
    );
    expect(response.body.data[2]).toEqual(
      expect.objectContaining({
        name: "Bali",
        destinationType: "region",
      })
    );
  });

  test("GET /api/destinations/:idOrSlug fetches a destination by slug", async () => {
    const response = await request(app).get("/api/destinations/batam");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Batam",
        slug: "batam",
      })
    );
  });

  test("GET /api/destinations/:idOrSlug fetches a destination by UUID", async () => {
    const listResponse = await request(app).get("/api/destinations");
    const batamId = listResponse.body.data.find(
      (destination) => destination.slug === "batam"
    ).id;

    const response = await request(app).get(`/api/destinations/${batamId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: batamId,
        slug: "batam",
      })
    );
  });

  test.each([
    "/api/destinations/not-a-real-destination",
    "/api/destinations/11111111-1111-4111-8111-111111111111",
  ])("GET %s returns 404 when the destination is missing", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Destination not found.");
  });
});

