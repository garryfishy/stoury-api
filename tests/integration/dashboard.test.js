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
  test("GET /api/dashboard/home returns the Batam-first home payload", async () => {
    const response = await request(app).get("/api/dashboard/home");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.destination).toEqual(
      expect.objectContaining({
        slug: "batam",
      })
    );
    expect(response.body.data.featured.length).toBeGreaterThan(0);
    expect(response.body.data.featured.length).toBeLessThanOrEqual(4);
    expect(response.body.data.featured[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        slug: expect.any(String),
        name: expect.any(String),
        shortLocation: expect.any(String),
        thumbnailImageUrl: null,
        rating: expect.any(Number),
        badge: expect.stringMatching(/^(Populer|Makanan|Belanja|Sejarah)$/),
        badgeKey: expect.stringMatching(/^(popular|food|shopping|history)$/),
      })
    );
    expect(response.body.data.meta).toEqual(
      expect.objectContaining({
        defaultDestinationSlug: "batam",
        featuredCount: expect.any(Number),
        exploreMoreCount: expect.any(Number),
      })
    );
  });

  test("featured and exploreMore do not overlap", async () => {
    const response = await request(app).get("/api/dashboard/home");

    expect(response.status).toBe(200);

    const featuredIds = response.body.data.featured.map((item) => item.id);
    const exploreMoreIds = response.body.data.exploreMore.map((item) => item.id);
    const overlap = featuredIds.filter((id) => exploreMoreIds.includes(id));

    expect(overlap).toEqual([]);
  });
});
