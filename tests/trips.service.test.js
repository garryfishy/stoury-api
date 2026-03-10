process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createTripsService } = require("../src/modules/trips/trips.service");

describe("trips service", () => {
  const destinationId = "22222222-2222-4222-8222-222222222222";
  const userId = "11111111-1111-4111-8111-111111111111";
  const existingTrip = {
    id: "44444444-4444-4444-8444-444444444444",
    userId,
    destinationId,
    title: "Batam long weekend",
    planningMode: "manual",
    startDate: "2026-04-10",
    endDate: "2026-04-12",
    budget: "2500000.00",
  };
  const activeDestination = {
    id: destinationId,
    name: "Batam",
    slug: "batam",
    isActive: true,
  };

  test("createTrip snapshots custom preference categories", async () => {
    const preferenceCategories = [
      { id: "55555555-5555-4555-8555-555555555555", name: "Food", slug: "food" },
      { id: "66666666-6666-4666-8666-666666666666", name: "Culture", slug: "culture" },
    ];
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: destinationId,
          name: "Batam",
          slug: "batam",
          isActive: true,
        }),
      },
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue(preferenceCategories),
      },
      Trip: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "44444444-4444-4444-8444-444444444444",
          userId,
          destinationId,
          title: "Batam long weekend",
          planningMode: "manual",
          startDate: "2026-04-10",
          endDate: "2026-04-12",
          budget: "2500000.00",
        }),
      },
      TripPreferenceCategory: {
        destroy: jest.fn().mockResolvedValue(0),
        bulkCreate: jest.fn().mockResolvedValue([]),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    const result = await tripsService.createTrip(userId, {
      title: "Batam long weekend",
      destinationId,
      planningMode: "manual",
      startDate: "2026-04-10",
      endDate: "2026-04-12",
      budget: 2500000,
      preferenceSource: "custom",
      preferenceCategoryIds: preferenceCategories.map((category) => category.id),
    });

    expect(db.Trip.create).toHaveBeenCalled();
    expect(db.TripPreferenceCategory.bulkCreate).toHaveBeenCalledWith(
      [
        {
          tripId: "44444444-4444-4444-8444-444444444444",
          preferenceCategoryId: preferenceCategories[0].id,
        },
        {
          tripId: "44444444-4444-4444-8444-444444444444",
          preferenceCategoryId: preferenceCategories[1].id,
        },
      ],
      { transaction: null }
    );
    expect(result.preferences).toHaveLength(2);
  });

  test("createTrip rejects overlapping trips for the same destination", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: destinationId,
          name: "Batam",
          slug: "batam",
          isActive: true,
        }),
      },
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      Trip: {
        findOne: jest.fn().mockResolvedValue({ id: "existing-trip-id" }),
        create: jest.fn(),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.createTrip(userId, {
        title: "Conflicting trip",
        destinationId,
        planningMode: "manual",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        budget: 1000000,
        preferenceSource: "custom",
        preferenceCategoryIds: [],
      })
    ).rejects.toMatchObject({
      message:
        "You already have an overlapping trip for this destination in the selected date range.",
      statusCode: 409,
    });
  });

  test("createTrip allows profile preference snapshots to be empty", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(activeDestination),
      },
      PreferenceCategory: {
        findAll: jest.fn(),
      },
      Trip: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(existingTrip),
      },
      TripPreferenceCategory: {
        destroy: jest.fn().mockResolvedValue(0),
        bulkCreate: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    const result = await tripsService.createTrip(userId, {
      title: "Batam long weekend",
      destinationId,
      planningMode: "manual",
      startDate: "2026-04-10",
      endDate: "2026-04-12",
      budget: 2500000,
      preferenceSource: "profile",
    });

    expect(result.preferences).toEqual([]);
    expect(db.TripPreferenceCategory.bulkCreate).not.toHaveBeenCalled();
  });

  test("createTrip rejects inactive destinations with a clear message", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          ...activeDestination,
          isActive: false,
        }),
      },
      PreferenceCategory: {
        findAll: jest.fn(),
      },
      Trip: {
        findOne: jest.fn(),
        create: jest.fn(),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.createTrip(userId, {
        title: "Blocked Trip",
        destinationId,
        planningMode: "manual",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        budget: 2500000,
        preferenceSource: "profile",
      })
    ).rejects.toMatchObject({
      message: "Destination is inactive and cannot be used for trip planning.",
      statusCode: 422,
    });
  });

  test("createTrip rejects unknown custom preference category IDs", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(activeDestination),
      },
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      Trip: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.createTrip(userId, {
        title: "Batam long weekend",
        destinationId,
        planningMode: "manual",
        startDate: "2026-04-10",
        endDate: "2026-04-12",
        budget: 2500000,
        preferenceSource: "custom",
        preferenceCategoryIds: ["55555555-5555-4555-8555-555555555555"],
      })
    ).rejects.toMatchObject({
      message: "One or more trip preference categories do not exist.",
      statusCode: 422,
    });
  });

  test("getTripDetail hides trips that do not belong to the user", async () => {
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue(null),
      },
      Destination: {
        findOne: jest.fn(),
      },
      TripPreferenceCategory: {
        findAll: jest.fn(),
      },
      PreferenceCategory: {
        findAll: jest.fn(),
      },
      Itinerary: {
        findOne: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(tripsService.getTripDetail(userId, existingTrip.id)).rejects.toMatchObject({
      message: "Trip not found.",
      statusCode: 404,
    });
  });

  test("updateTrip rejects partial date updates that invert the stored range", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(activeDestination),
      },
      Trip: {
        findOne: jest.fn().mockResolvedValue(existingTrip),
      },
      Itinerary: {
        findOne: jest.fn().mockResolvedValue(null),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      PreferenceCategory: {
        findAll: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.updateTrip(userId, existingTrip.id, {
        startDate: "2026-04-20",
      })
    ).rejects.toMatchObject({
      message: "startDate must be on or before endDate.",
      statusCode: 422,
    });
  });

  test("updateTrip rejects restricted fields when an itinerary already exists", async () => {
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue(existingTrip),
      },
      Itinerary: {
        findOne: jest.fn().mockResolvedValue({ id: "itinerary-id", tripId: existingTrip.id }),
      },
      Destination: {
        findOne: jest.fn(),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      PreferenceCategory: {
        findAll: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.updateTrip(userId, existingTrip.id, {
        destinationId: "99999999-9999-4999-8999-999999999999",
      })
    ).rejects.toMatchObject({
      message:
        "Trips with an existing itinerary can only update title, budget, and preference snapshots in MVP.",
      statusCode: 409,
    });
  });

  test("updateTrip rejects unknown custom preference category IDs", async () => {
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue(activeDestination),
      },
      Trip: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(existingTrip)
          .mockResolvedValueOnce(null),
      },
      Itinerary: {
        findOne: jest.fn().mockResolvedValue(null),
      },
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.updateTrip(userId, existingTrip.id, {
        preferenceSource: "custom",
        preferenceCategoryIds: ["55555555-5555-4555-8555-555555555555"],
      })
    ).rejects.toMatchObject({
      message: "One or more trip preference categories do not exist.",
      statusCode: 422,
    });
  });

  test("updateTrip rejects switching to an inactive destination", async () => {
    const inactiveDestinationId = "99999999-9999-4999-8999-999999999999";
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: inactiveDestinationId,
          name: "Yogyakarta",
          slug: "yogyakarta",
          isActive: false,
        }),
      },
      Trip: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(existingTrip)
          .mockResolvedValueOnce(null),
      },
      Itinerary: {
        findOne: jest.fn().mockResolvedValue(null),
      },
      TripPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      PreferenceCategory: {
        findAll: jest.fn(),
      },
      UserPreferenceCategory: {
        findAll: jest.fn(),
      },
    };
    const tripsService = createTripsService({
      dbProvider: () => db,
    });

    await expect(
      tripsService.updateTrip(userId, existingTrip.id, {
        destinationId: inactiveDestinationId,
      })
    ).rejects.toMatchObject({
      message: "Destination is inactive and cannot be used for trip planning.",
      statusCode: 422,
    });
  });
});
