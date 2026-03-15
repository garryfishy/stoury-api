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
        enrichAttraction: jest.fn(),
        getReviewCandidates: jest.fn(),
        resolveReview: jest.fn(),
        rejectReview: jest.fn(),
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
      getReviewCandidates: jest.fn(),
      resolveReview: jest.fn(),
      rejectReview: jest.fn(),
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
          isActive: true,
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
      enrichmentService: {
        listPendingEnrichment: jest.fn(),
        getReviewCandidates: jest.fn(),
        resolveReview: jest.fn(),
        rejectReview: jest.fn(),
      },
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
      enrichAttraction: jest.fn().mockResolvedValue({ outcome: "enriched" }),
      getReviewCandidates: jest.fn().mockResolvedValue({ candidates: [] }),
      resolveReview: jest.fn().mockResolvedValue({ outcome: "enriched" }),
      rejectReview: jest.fn().mockResolvedValue({ outcome: "failed" }),
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
    await service.backfillPendingAttractionPhotos("attr-1", { force: true });
    await service.backfillPendingBatchPhotos({
      destinationId: "dest-1",
      limit: 10,
      force: true,
    });

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
    expect(enrichmentService.backfillPhotos).toHaveBeenCalledWith({
      attractionId: "attr-1",
      limit: 1,
      dryRun: false,
      force: true,
    });
    expect(enrichmentService.backfillPhotos).toHaveBeenCalledWith({
      attractionId: null,
      destinationId: "dest-1",
      limit: 10,
      dryRun: false,
      force: true,
    });
    await service.resolvePendingReview("attr-1", "google-place-1");
    await service.rejectPendingReview("attr-1", "no match");
    expect(enrichmentService.resolveReview).toHaveBeenCalledWith("attr-1", "google-place-1");
    expect(enrichmentService.rejectReview).toHaveBeenCalledWith("attr-1", "no match");
  });

  test("getPendingEnrichmentPageData combines queue data with destination options", async () => {
    const enrichmentService = {
      listPendingEnrichment: jest
        .fn()
        .mockResolvedValueOnce({ total: 14 })
        .mockResolvedValueOnce({ total: 3 })
        .mockResolvedValueOnce({ total: 2 })
        .mockResolvedValueOnce({
          items: [{ id: "attr-1" }],
          total: 1,
          pagination: { page: 1, totalPages: 1 },
        }),
      enrichMissing: jest.fn(),
      backfillPhotos: jest.fn(),
      enrichAttraction: jest.fn(),
      getReviewCandidates: jest.fn(),
      resolveReview: jest.fn(),
      rejectReview: jest.fn(),
    };
    const destinations = [
      {
        id: "dest-1",
        name: "Batam",
        slug: "batam",
        isActive: true,
        countryName: "Indonesia",
      },
    ];
    const service = createAdminWebService({
      dbProvider: () => ({
        Destination: {
          findAll: jest.fn().mockResolvedValue(destinations),
        },
        Attraction: {
          count: jest.fn().mockResolvedValue(0),
        },
      }),
      loginService: { login: jest.fn() },
      enrichmentService,
      runtimeStatusProvider: jest.fn().mockReturnValue({
        status: "enabled",
        message: "ok",
      }),
    });

    const result = await service.getPendingEnrichmentPageData({
      page: 1,
      limit: 25,
      status: "pending",
      staleOnly: false,
      staleDays: 30,
    });

    expect(result.pendingEnrichment).toEqual(
      expect.objectContaining({
        total: 1,
      })
    );
    expect(result.destinationOptions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "dest-1" })])
    );
  });

  test("getPendingReviewPageData combines queue data with manual review candidates", async () => {
    const enrichmentService = {
      listPendingEnrichment: jest
        .fn()
        .mockResolvedValueOnce({ total: 14 })
        .mockResolvedValueOnce({ total: 3 })
        .mockResolvedValueOnce({ total: 2 })
        .mockResolvedValueOnce({
          items: [],
          total: 0,
          pagination: { page: 1, totalPages: 1 },
        }),
      enrichMissing: jest.fn(),
      backfillPhotos: jest.fn(),
      enrichAttraction: jest.fn(),
      getReviewCandidates: jest.fn().mockResolvedValue({
        attraction: { id: "attr-1", name: "Pantai Nongsa" },
        candidates: [{ placeId: "google-place-1" }],
      }),
      resolveReview: jest.fn(),
      rejectReview: jest.fn(),
    };
    const service = createAdminWebService({
      dbProvider: () => ({
        Destination: {
          findAll: jest.fn().mockResolvedValue([]),
        },
        Attraction: {
          count: jest.fn().mockResolvedValue(0),
        },
      }),
      loginService: { login: jest.fn() },
      enrichmentService,
      runtimeStatusProvider: jest.fn().mockReturnValue({
        status: "enabled",
        message: "ok",
      }),
    });

    const result = await service.getPendingReviewPageData("attr-1", {
      page: 1,
      limit: 25,
      status: "needs_review",
      staleOnly: false,
      staleDays: 30,
    });

    expect(result.review).toEqual(
      expect.objectContaining({
        attraction: expect.objectContaining({
          id: "attr-1",
        }),
      })
    );
  });

  test("getAttractionAssetsPageData filters attractions by usable image state", async () => {
    const destinations = [
      {
        id: "dest-1",
        name: "Batam",
        slug: "batam",
        isActive: true,
        countryName: "Indonesia",
      },
    ];
    const service = createAdminWebService({
      dbProvider: () => ({
        Destination: {
          findAll: jest.fn().mockResolvedValue(destinations),
        },
        Attraction: {
          findAll: jest.fn().mockResolvedValue([
            {
              id: "attr-with",
              destinationId: "dest-1",
              isActive: true,
              name: "Barelang Bridge",
              slug: "barelang-bridge",
              mainImageUrl: "https://cdn.example.com/barelang.jpg",
              thumbnailImageUrl: "https://cdn.example.com/barelang-thumb.jpg",
              metadata: {
                assetSource: {
                  provider: "stoury_upload",
                },
              },
            },
            {
              id: "attr-without",
              destinationId: "dest-1",
              isActive: true,
              name: "Harbour Bay Waterfront",
              slug: "harbour-bay-waterfront",
              mainImageUrl: "https://example.com/assets/attractions/batam/harbour-bay-main.svg",
              thumbnailImageUrl: null,
              metadata: {},
            },
          ]),
        },
      }),
      loginService: { login: jest.fn() },
      enrichmentService: {
        listPendingEnrichment: jest.fn(),
        getReviewCandidates: jest.fn(),
        resolveReview: jest.fn(),
        rejectReview: jest.fn(),
      },
      runtimeStatusProvider: jest.fn().mockReturnValue({
        status: "enabled",
        message: "ok",
      }),
    });
    jest.spyOn(service, "getDashboardData").mockResolvedValue({
      summary: {
        pendingCount: 1,
        staleCount: 0,
        needsReviewCount: 0,
        staleDays: 30,
      },
    });

    const result = await service.getAttractionAssetsPageData({
      imageState: "without_image",
      page: 1,
      limit: 24,
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: "attr-without",
        hasUsableImage: false,
      }),
    ]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 24,
      total: 1,
      totalPages: 1,
    });
  });
});
