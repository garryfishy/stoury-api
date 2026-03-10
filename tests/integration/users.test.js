const jwt = require("jsonwebtoken");
const request = require("supertest");
const { app } = require("./helpers/app");
const { authHeader, registerAndLogin } = require("./helpers/auth");
const {
  cleanupTestArtifacts,
  closeTestDb,
  ensureTestDbReady,
} = require("./helpers/db");

beforeAll(async () => {
  await ensureTestDbReady();
  await cleanupTestArtifacts();
});

afterAll(async () => {
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("users integration", () => {
  test("GET /api/users/me returns the current profile for a valid token", async () => {
    const auth = await registerAndLogin(request, app, { label: "users-get-me" });

    const response = await request(app)
      .get("/api/users/me")
      .set(authHeader(auth.accessToken));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Profile fetched.",
      data: {
        id: expect.any(String),
        name: "Test User",
        email: auth.email,
        roles: expect.arrayContaining(["user"]),
      },
    });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  test("GET /api/users/me rejects missing bearer tokens", async () => {
    const response = await request(app).get("/api/users/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  test("GET /api/users/me rejects expired access tokens", async () => {
    const auth = await registerAndLogin(request, app, { label: "users-expired-token" });
    const expiredAccessToken = jwt.sign(
      {
        sub: auth.user.id,
        email: auth.email,
        roles: ["user"],
        tokenType: "access",
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -1 }
    );

    const response = await request(app)
      .get("/api/users/me")
      .set(authHeader(expiredAccessToken));

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired access token.");
  });

  test("PATCH /api/users/me updates and persists the profile name", async () => {
    const auth = await registerAndLogin(request, app, { label: "users-update-me" });

    const updateResponse = await request(app)
      .patch("/api/users/me")
      .set(authHeader(auth.accessToken))
      .send({ name: "Updated QA User" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).toEqual(
      expect.objectContaining({
        id: auth.user.id,
        name: "Updated QA User",
        email: auth.email,
      })
    );

    const profileResponse = await request(app)
      .get("/api/users/me")
      .set(authHeader(auth.accessToken));

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.name).toBe("Updated QA User");
  });

  test.each([
    ["empty name", { name: "" }, "name"],
    ["too long name", { name: "x".repeat(101) }, "name"],
    ["empty body", {}, "name"],
  ])("PATCH /api/users/me returns 422 for %s", async (_label, payload, path) => {
    const auth = await registerAndLogin(request, app, { label: "users-update-invalid" });

    const response = await request(app)
      .patch("/api/users/me")
      .set(authHeader(auth.accessToken))
      .send(payload);

    expect(response.status).toBe(422);
    expect(response.body.message).toBe("Validation failed.");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path,
          message: expect.any(String),
        }),
      ])
    );
  });
});

