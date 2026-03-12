const { Op } = require("sequelize");
const { createAdminWebService } = require("../src/modules/admin-web/admin-web.service");

describe("admin web service", () => {
  test("loginAdmin rejects users without the admin role", async () => {
    const service = createAdminWebService({
      loginService: {
        login: jest.fn().mockResolvedValue({
          accessToken: "access-token",
          user: {
            roles: ["user"],
          },
        }),
      },
      enrichmentService: {
        listPendingEnrichment: jest.fn(),
        backfillPhotos: jest.fn(),
        enrichMissing: jest.fn(),
      },
      dbProvider: jest.fn(),
      runtimeStatusProvider: jest.fn(),
    });

    await expect(
      service.loginAdmin({
        email: "user@example.com",
        password: "password",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You do not have permission to access the admin dashboard.",
    });
  });

  test("getDashboardData reuses admin enrichment totals for the shell summary", async () => {
    const destinations = [
      {
        id: "dest-1",
        name: "Batam",
        slug: "batam",
        isActive: true,
        countryName: "Indonesia",
      },
    ];
    const Attraction = {
      count: jest
        .fn()
        .mockResolvedValueOnce(24)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(3),
    };
    const enrichmentService = {
      listPendingEnrichment: jest
        .fn()
        .mockResolvedValueOnce({ total: 14 })
        .mockResolvedValueOnce({ total: 3 })
        .mockResolvedValueOnce({ total: 2 }),
    };
    const runtimeStatus = {
      enabled: true,
      status: "enabled",
      message: "Admin attraction enrichment is enabled.",
    };
    const service = createAdminWebService({
      dbProvider: () => ({
        Destination: {
          findAll: jest.fn().mockResolvedValue(destinations),
        },
        Attraction,
      }),
      loginService: {
        login: jest.fn(),
      },
      enrichmentService,
      runtimeStatusProvider: jest.fn().mockReturnValue(runtimeStatus),
    });

    const dashboardData = await service.getDashboardData();

    expect(enrichmentService.listPendingEnrichment).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit: 1,
      status: "pending",
      staleOnly: false,
      staleDays: 30,
    });
    expect(enrichmentService.listPendingEnrichment).toHaveBeenNthCalledWith(2, {
      page: 1,
      limit: 1,
      status: "enriched",
      staleOnly: true,
      staleDays: 30,
    });
    expect(enrichmentService.listPendingEnrichment).toHaveBeenNthCalledWith(3, {
      page: 1,
      limit: 1,
      status: "needs_review",
      staleOnly: false,
      staleDays: 30,
    });
    expect(dashboardData).toEqual({
      runtimeStatus,
      summary: {
        pendingCount: 14,
        staleCount: 3,
        needsReviewCount: 2,
        staleDays: 30,
      },
      destinations: [
        expect.objectContaining({
          id: "dest-1",
          attractionCount: 24,
          pendingCount: 6,
          photoBackfillCount: 3,
        }),
      ],
    });
    expect(Attraction.count).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          destinationId: "dest-1",
          externalSource: "google_places",
          externalPlaceId: {
            [Op.ne]: null,
          },
        }),
      })
    );
  });

  test("setDestinationActiveState updates the destination flag", async () => {
    const destination = {
      id: "dest-1",
      name: "Batam",
      slug: "batam",
      isActive: false,
      update: jest.fn().mockImplementation(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };
    const service = createAdminWebService({
      dbProvider: () => ({
        Destination: {
          findByPk: jest.fn().mockResolvedValue(destination),
        },
      }),
      loginService: { login: jest.fn() },
      enrichmentService: { listPendingEnrichment: jest.fn() },
      runtimeStatusProvider: jest.fn(),
    });

    const result = await service.setDestinationActiveState("dest-1", true);

    expect(destination.update).toHaveBeenCalledWith({ isActive: true });
    expect(result).toEqual(expect.objectContaining({ id: "dest-1", isActive: true }));
  });

  test("destination enrich actions delegate to the admin enrichment service", async () => {
    const destination = { id: "dest-1" };
    const enrichmentService = {
      listPendingEnrichment: jest.fn(),
      enrichMissing: jest.fn().mockResolvedValue({ attemptedCount: 5 }),
      backfillPhotos: jest.fn().mockResolvedValue({ attemptedCount: 4 }),
    };
    const service = createAdminWebService({
      dbProvider: () => ({
        Destination: {
          findByPk: jest.fn().mockResolvedValue(destination),
        },
      }),
      loginService: { login: jest.fn() },
      enrichmentService,
      runtimeStatusProvider: jest.fn(),
    });

    await service.enrichDestination("dest-1");
    await service.backfillDestinationPhotos("dest-1", { force: true });

    expect(enrichmentService.enrichMissing).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationId: "dest-1",
        dryRun: false,
      })
    );
    expect(enrichmentService.backfillPhotos).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationId: "dest-1",
        dryRun: false,
        force: true,
      })
    );
  });
});
