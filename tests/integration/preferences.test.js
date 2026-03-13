const request = require("supertest");
const { app } = require("./helpers/app");
const { authHeader, registerAndLogin } = require("./helpers/auth");
const { cleanupTestArtifacts, closeTestDb, ensureTestDbReady } = require("./helpers/db");
const { loadSeedData } = require("./helpers/seed-data");

let seedData;

beforeAll(async () => {
  await ensureTestDbReady();
  await cleanupTestArtifacts();
  seedData = await loadSeedData();
});

afterAll(async () => {
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("preferences integration", () => {
  test("GET /api/preferences returns the public active preference catalog", async () => {
    const response = await request(app).get("/api/preferences");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Preference categories fetched.");
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: seedData.preferenceCategories.popular.id,
        slug: "popular",
        name: "Populer",
      }),
      expect.objectContaining({
        id: seedData.preferenceCategories.food.id,
        slug: "food",
        name: "Makanan",
      }),
      expect.objectContaining({
        id: seedData.preferenceCategories.shopping.id,
        slug: "shopping",
        name: "Belanja",
      }),
      expect.objectContaining({
        id: seedData.preferenceCategories.history.id,
        slug: "history",
        name: "Sejarah",
      }),
    ]);
  });

  test("GET /api/preferences/me returns an empty array for a new user", async () => {
    const auth = await registerAndLogin(request, app, { label: "preferences-empty" });

    const response = await request(app)
      .get("/api/preferences/me")
      .set(authHeader(auth.accessToken));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Preferences fetched.",
      data: [],
    });
  });

  test("GET /api/preferences/me rejects unauthenticated requests", async () => {
    const response = await request(app).get("/api/preferences/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  test("PUT /api/preferences/me replaces, reloads, and clears preferences", async () => {
    const auth = await registerAndLogin(request, app, { label: "preferences-replace" });
    const popularId = seedData.preferenceCategories.popular.id;
    const foodId = seedData.preferenceCategories.food.id;
    const historyId = seedData.preferenceCategories.history.id;

    const firstResponse = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({ categoryIds: [popularId, foodId] });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.data).toEqual([
      expect.objectContaining({
        id: popularId,
        slug: "popular",
        name: expect.any(String),
        description: expect.any(String),
      }),
      expect.objectContaining({
        id: foodId,
        slug: "food",
        name: expect.any(String),
        description: expect.any(String),
      }),
    ]);

    const getAfterFirstSet = await request(app)
      .get("/api/preferences/me")
      .set(authHeader(auth.accessToken));

    expect(getAfterFirstSet.status).toBe(200);
    expect(getAfterFirstSet.body.data.map((category) => category.slug)).toEqual([
      "popular",
      "food",
    ]);

    const replaceResponse = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({ categoryIds: [historyId] });

    expect(replaceResponse.status).toBe(200);
    expect(replaceResponse.body.data).toEqual([
      expect.objectContaining({
        id: historyId,
        slug: "history",
      }),
    ]);

    const clearResponse = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({ categoryIds: [] });

    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.data).toEqual([]);
  });

  test("PUT /api/preferences/me rejects unknown category IDs", async () => {
    const auth = await registerAndLogin(request, app, { label: "preferences-unknown" });

    const response = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({ categoryIds: ["11111111-1111-4111-8111-111111111111"] });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe(
      "One or more preference categories do not exist."
    );
  });

  test("PUT /api/preferences/me rejects duplicate category IDs", async () => {
    const auth = await registerAndLogin(request, app, { label: "preferences-duplicate" });
    const popularId = seedData.preferenceCategories.popular.id;

    const response = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({ categoryIds: [popularId, popularId] });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "categoryIds" }),
      ])
    );
  });

  test("PUT /api/preferences/me rejects invalid UUID formats", async () => {
    const auth = await registerAndLogin(request, app, { label: "preferences-invalid-uuid" });

    const response = await request(app)
      .put("/api/preferences/me")
      .set(authHeader(auth.accessToken))
      .send({ categoryIds: ["not-a-uuid"] });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "categoryIds.0" }),
      ])
    );
  });

  test("PUT /api/preferences/me rejects unauthenticated requests", async () => {
    const response = await request(app)
      .put("/api/preferences/me")
      .send({ categoryIds: [] });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });
});
