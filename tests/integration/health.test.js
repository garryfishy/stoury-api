const request = require("supertest");
const { app } = require("./helpers/app");
const { closeTestDb, ensureTestDbReady } = require("./helpers/db");

beforeAll(async () => {
  await ensureTestDbReady();
});

afterAll(async () => {
  await closeTestDb();
});

describe("GET /health", () => {
  test("returns the healthy app payload", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Service is healthy.",
      data: expect.objectContaining({
        app: "stoury-api",
        environment: "test",
      }),
    });
  });
});

