const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");

beforeAll(async () => {
  await ensureTestDbReady();
});

afterAll(async () => {
  await closeTestDb();
});

describe("dashboard integration", () => {
  test("GET /api/dashboard/home returns global featured cards with destination info", async () => {
    const response = await request(app).get("/api/dashboard/home");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.featured.length).toBeGreaterThan(0);
    expect(response.body.data.featured.length).toBeLessThanOrEqual(4);
    expect(response.body.data.featured[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        slug: expect.any(String),
        name: expect.any(String),
        shortLocation: expect.any(String),
        thumbnailImageUrl: expect.stringContaining("/api/attractions/"),
        rating: expect.any(Number),
        badge: expect.stringMatching(/^(Populer|Makanan|Belanja|Sejarah)$/),
        badgeKey: expect.stringMatching(/^(popular|food|shopping|history)$/),
        destination: expect.objectContaining({
          id: expect.any(String),
          slug: expect.any(String),
          name: expect.any(String),
        }),
      })
    );
    expect(response.body.data.meta).toEqual(
      expect.objectContaining({
        featuredCount: expect.any(Number),
        candidatePoolSize: expect.any(Number),
        totalActiveAttractionCount: expect.any(Number),
      })
    );
  });

  test("GET /api/dashboard/search returns global active-destination search results", async () => {
    const response = await request(app)
      .get("/api/dashboard/search")
      .query({
        q: "batam",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.query).toBe("batam");
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 12,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      })
    );
    expect(response.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shortLocation: expect.any(String),
          destination: expect.objectContaining({
            slug: expect.any(String),
          }),
        }),
      ])
    );
  });
});
