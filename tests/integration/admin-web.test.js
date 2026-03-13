const request = require("supertest");
const { app } = require("./helpers/app");
const { googlePlacesClient } = require("../../src/services/google-places");
const {
  cleanupTestArtifacts,
  closeTestDb,
  db,
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
  jest.restoreAllMocks();
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
    expect(dashboardResponse.text).toContain("Destinations");
  });

  test("admin users can open the destinations operations page", async () => {
    const admin = await createAdminUser("admin-web-destinations");
    const agent = request.agent(app);

    await agent
      .post("/admin/login")
      .type("form")
      .send({
        email: admin.email,
        password: admin.password,
      });

    const response = await agent.get("/admin/destinations");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain('data-page="admin-destinations"');
    expect(response.text).toContain("Enable destinations and run enrichment");
    expect(response.text).toContain("Enrich missing");
    expect(response.text).toContain("Backfill photos");
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
    expect(pendingResponse.text).toContain('data-page="admin-pending-enrichment"');
    expect(pendingResponse.text).toContain("Run batch enrichment");
    expect(pendingResponse.text).toContain("Run batch photo backfill");
    expect(pendingResponse.text).toContain("Apply filters");
  });

  test("admin users can open the manual review page for a needs_review attraction", async () => {
    const admin = await createAdminUser("admin-web-review");
    const agent = request.agent(app);
    const attraction = await db.Attraction.findOne({
      where: {
        isActive: true,
      },
      order: [["destinationId", "ASC"], ["name", "ASC"]],
    });

    expect(attraction).toBeTruthy();

    const originalState = {
      enrichmentStatus: attraction.enrichmentStatus,
      enrichmentError: attraction.enrichmentError,
    };

    await attraction.update({
      enrichmentStatus: "needs_review",
      enrichmentError: null,
    });

    jest.spyOn(googlePlacesClient, "textSearch").mockResolvedValueOnce([
      {
        placeId: "google-place-1",
        name: attraction.name,
        formattedAddress: attraction.fullAddress || `${attraction.name}, Indonesia`,
        location: attraction.latitude
          ? {
              latitude: Number(attraction.latitude),
              longitude: Number(attraction.longitude),
            }
          : null,
        rating: 4.4,
        userRatingsTotal: 1234,
        types: ["tourist_attraction"],
      },
      {
        placeId: "google-place-2",
        name: `${attraction.name} Resort`,
        formattedAddress: attraction.fullAddress || `${attraction.name}, Indonesia`,
        location: attraction.latitude
          ? {
              latitude: Number(attraction.latitude) + 0.001,
              longitude: Number(attraction.longitude) + 0.001,
            }
          : null,
        rating: 4.2,
        userRatingsTotal: 900,
        types: ["lodging", "tourist_attraction"],
      },
    ]);

    await agent
      .post("/admin/login")
      .type("form")
      .send({
        email: admin.email,
        password: admin.password,
      });

    const response = await agent.get(`/admin/enrichment/${attraction.id}/review`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain('data-page="admin-pending-review"');
    expect(response.text).toContain("Approve this match");
    expect(response.text).toContain("Reject candidates");

    await attraction.update(originalState);
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

  test("admin users can enable or disable a destination from the destinations page", async () => {
    const admin = await createAdminUser("admin-web-destination-toggle");
    const agent = request.agent(app);
    const destination = await db.Destination.findOne({
      where: {
        slug: "yogyakarta",
      },
    });

    expect(destination).toBeTruthy();

    await agent
      .post("/admin/login")
      .type("form")
      .send({
        email: admin.email,
        password: admin.password,
      });

    const response = await agent
      .post(`/admin/destinations/${destination.id}/state`)
      .type("form")
      .send({
        isActive: "true",
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Destination updated");
    expect(response.text).toContain('data-page="admin-destinations"');

    const refreshed = await db.Destination.findByPk(destination.id);
    expect(refreshed.isActive).toBe(true);

    await refreshed.update({ isActive: false });
  });
});
