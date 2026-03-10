const request = require("supertest");
const { app } = require("./helpers/app");
const {
  authHeader,
  createTestEmail,
  registerAndLogin,
} = require("./helpers/auth");
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

describe("auth integration", () => {
  describe("POST /api/auth/register", () => {
    test("registers a user and returns tokens plus the serialized user", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "QA Register",
        email: createTestEmail("register"),
        password: "TestPass123!",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          name: "QA Register",
          email: expect.stringContaining("@example.com"),
          roles: expect.arrayContaining(["user"]),
        },
      });
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    test("rejects duplicate emails", async () => {
      const email = createTestEmail("duplicate");

      const firstResponse = await request(app).post("/api/auth/register").send({
        name: "First User",
        email,
        password: "TestPass123!",
      });
      const secondResponse = await request(app).post("/api/auth/register").send({
        name: "Second User",
        email,
        password: "TestPass123!",
      });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body).toMatchObject({
        success: false,
        message: "Email is already registered.",
      });
    });

    test.each([
      [
        "missing name",
        { email: createTestEmail("missing-name"), password: "TestPass123!" },
        "name",
      ],
      [
        "missing email",
        { name: "QA Missing Email", password: "TestPass123!" },
        "email",
      ],
      [
        "invalid email",
        { name: "QA Invalid Email", email: "not-an-email", password: "TestPass123!" },
        "email",
      ],
      [
        "short password",
        { name: "QA Short Password", email: createTestEmail("short-password"), password: "short" },
        "password",
      ],
      [
        "long password",
        {
          name: "QA Long Password",
          email: createTestEmail("long-password"),
          password: "x".repeat(73),
        },
        "password",
      ],
      [
        "missing password",
        { name: "QA Missing Password", email: createTestEmail("missing-password") },
        "password",
      ],
    ])("returns 422 for %s", async (_label, payload, path) => {
      const response = await request(app).post("/api/auth/register").send(payload);

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
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

  describe("POST /api/auth/login", () => {
    test("logs in with valid credentials and access token authenticates protected routes", async () => {
      const auth = await registerAndLogin(request, app, { label: "login-happy" });

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: auth.email,
        password: auth.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            id: expect.any(String),
            email: auth.email,
            roles: expect.arrayContaining(["user"]),
          }),
        })
      );

      const profileResponse = await request(app)
        .get("/api/users/me")
        .set(authHeader(loginResponse.body.data.accessToken));

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.email).toBe(auth.email);
    });

    test("rejects wrong passwords", async () => {
      const auth = await registerAndLogin(request, app, { label: "login-wrong-password" });

      const response = await request(app).post("/api/auth/login").send({
        email: auth.email,
        password: "WrongPass123!",
      });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid email or password.",
      });
    });

    test("rejects unknown emails", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: createTestEmail("unknown-login"),
        password: "TestPass123!",
      });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid email or password.",
      });
    });

    test("returns 422 when required fields are missing", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "email" }),
          expect.objectContaining({ path: "password" }),
        ])
      );
    });
  });

  describe("POST /api/auth/refresh", () => {
    test("rotates refresh tokens and the old refresh token is revoked", async () => {
      const auth = await registerAndLogin(request, app, { label: "refresh-rotation" });

      const refreshResponse = await request(app).post("/api/auth/refresh").send({
        refreshToken: auth.refreshToken,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toEqual(expect.any(String));
      expect(refreshResponse.body.data.refreshToken).toEqual(expect.any(String));
      expect(refreshResponse.body.data.refreshToken).not.toBe(auth.refreshToken);

      const profileResponse = await request(app)
        .get("/api/users/me")
        .set(authHeader(refreshResponse.body.data.accessToken));

      expect(profileResponse.status).toBe(200);

      const reusedOldTokenResponse = await request(app).post("/api/auth/refresh").send({
        refreshToken: auth.refreshToken,
      });

      expect(reusedOldTokenResponse.status).toBe(401);
      expect(reusedOldTokenResponse.body.message).toBe(
        "Refresh token has been revoked."
      );
    });

    test("rejects invalid refresh tokens", async () => {
      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "not-a-real-token",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid or expired refresh token.");
    });

    test("returns 422 when refreshToken is missing", async () => {
      const response = await request(app).post("/api/auth/refresh").send({});

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "refreshToken" }),
        ])
      );
    });
  });

  describe("POST /api/auth/logout", () => {
    test("revokes a valid refresh token", async () => {
      const auth = await registerAndLogin(request, app, { label: "logout-valid" });

      const logoutResponse = await request(app).post("/api/auth/logout").send({
        refreshToken: auth.refreshToken,
      });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toEqual({
        success: true,
        message: "Logout successful.",
        data: null,
      });

      const refreshAfterLogoutResponse = await request(app).post("/api/auth/refresh").send({
        refreshToken: auth.refreshToken,
      });

      expect(refreshAfterLogoutResponse.status).toBe(401);
      expect(refreshAfterLogoutResponse.body.message).toBe(
        "Refresh token has been revoked."
      );
    });

    test("succeeds silently for an unknown token", async () => {
      const response = await request(app).post("/api/auth/logout").send({
        refreshToken: "totally-unknown-refresh-token",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Logout successful.",
        data: null,
      });
    });
  });
});

