const request = require("supertest");
const { app } = require("./helpers/app");
const {
  cleanupTestArtifacts,
  closeTestDb,
  ensureTestDbReady,
} = require("./helpers/db");
const {
  grantRole,
  registerAndLogin,
} = require("./helpers/auth");

const createAdminUser = async (label) => {
  const auth = await registerAndLogin(request, app, { label });

  await grantRole(auth.user.id, "admin");

  return auth;
};

beforeAll(async () => {
  await ensureTestDbReady();
  await cleanupTestArtifacts();
});

afterEach(async () => {
  await cleanupTestArtifacts();
});

afterAll(async () => {
  await cleanupTestArtifacts();
  await closeTestDb();
});

describe("admin web integration", () => {
  test("GET /admin/login renders the login page", async () => {
    const response = await request(app).get("/admin/login");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain('data-page="admin-login"');
    expect(response.text).toContain("Stoury Admin");
  });

  test("GET /admin redirects unauthenticated users to the login page", async () => {
    const response = await request(app).get("/admin");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/admin/login?reason=auth_required");
  });

  test("POST /admin/login rejects invalid credentials cleanly", async () => {
    const response = await request(app)
      .post("/admin/login")
      .type("form")
      .send({
        email: "missing-admin@example.com",
        password: "WrongPass123!",
      });

    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Login unsuccessful");
    expect(response.text).toContain("Invalid email or password.");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("stoury_admin_access=;")])
    );
  });

  test("POST /admin/login blocks non-admin users", async () => {
    const auth = await registerAndLogin(request, app, { label: "admin-web-user" });

    const response = await request(app)
      .post("/admin/login")
      .type("form")
      .send({
        email: auth.email,
        password: auth.password,
      });

    expect(response.status).toBe(403);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Admin role required");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("stoury_admin_access=;")])
    );
  });

  test("admin users can sign in and reach the dashboard shell", async () => {
    const admin = await createAdminUser("admin-web-admin");
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/admin/login")
      .type("form")
      .send({
        email: admin.email,
        password: admin.password,
      });

    expect(loginResponse.status).toBe(302);
    expect(loginResponse.headers.location).toBe("/admin");
    expect(loginResponse.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("stoury_admin_access=")])
    );

    const dashboardResponse = await agent.get("/admin");

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.headers["content-type"]).toContain("text/html");
    expect(dashboardResponse.text).toContain('data-page="admin-dashboard"');
    expect(dashboardResponse.text).toContain("Operational enrichment at a glance");
    expect(dashboardResponse.text).toContain("Pending attractions");
  });

  test("admin users can open the pending enrichment page shell", async () => {
    const admin = await createAdminUser("admin-web-pending");
    const agent = request.agent(app);

    await agent
      .post("/admin/login")
      .type("form")
      .send({
        email: admin.email,
        password: admin.password,
      });

    const pendingResponse = await agent.get("/admin/enrichment/pending");

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.headers["content-type"]).toContain("text/html");
    expect(pendingResponse.text).toContain("Pending Enrichment");
    expect(pendingResponse.text).toContain("Current queue signals");
  });

  test("POST /admin/logout clears the admin cookie", async () => {
    const admin = await createAdminUser("admin-web-logout");
    const agent = request.agent(app);

    await agent
      .post("/admin/login")
      .type("form")
      .send({
        email: admin.email,
        password: admin.password,
      });

    const logoutResponse = await agent.post("/admin/logout");

    expect(logoutResponse.status).toBe(302);
    expect(logoutResponse.headers.location).toBe("/admin/login?reason=logged_out");
    expect(logoutResponse.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("stoury_admin_access=;")])
    );

    const dashboardResponse = await agent.get("/admin");

    expect(dashboardResponse.status).toBe(302);
    expect(dashboardResponse.headers.location).toBe("/admin/login?reason=auth_required");
  });
});
