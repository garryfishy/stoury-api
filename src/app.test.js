const request = require("supertest");
const { app } = require("./app");

describe("API cache headers", () => {
  test("disables conditional caching for API responses", async () => {
    const response = await request(app).get("/api/__cache_test__").expect(404);

    expect(response.headers.etag).toBeUndefined();
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers.pragma).toBe("no-cache");
    expect(response.headers.expires).toBe("0");
  });
});
