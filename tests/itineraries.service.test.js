process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createItinerariesService } = require("../src/modules/itineraries/itineraries.service");

const trip = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: "11111111-1111-4111-8111-111111111111",
  destinationId: "22222222-2222-4222-8222-222222222222",
  planningMode: "manual",
  startDate: "2026-04-10",
  endDate: "2026-04-11",
};

const attraction = {
  id: "33333333-3333-4333-8333-333333333333",
  destinationId: "22222222-2222-4222-8222-222222222222",
  name: "Pantai Nongsa",
  slug: "pantai-nongsa",
  fullAddress: "Nongsa, Batam, Kepulauan Riau, Indonesia",
  latitude: "1.1870000",
  longitude: "104.1190000",
  estimatedDurationMinutes: 120,
  rating: "4.5",
  thumbnailImageUrl: null,
  mainImageUrl: null,
  externalSource: "google_places",
  externalPlaceId: "ChIJexamplePantaiNongsa",
  openingHours: {
    friday: [{ open: "08:00", close: "18:00" }],
    saturday: [{ open: "08:00", close: "18:00" }],
  },
};

describe("itineraries service", () => {
  test("getTripItinerary returns an empty itinerary payload when none exists yet", async () => {
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue(trip),
      },
      Attraction: {
        findAll: jest.fn(),
      },
      Itinerary: {
        findOne: jest.fn().mockResolvedValue(null),
      },
      ItineraryDay: {
        findAll: jest.fn(),
      },
      ItineraryItem: {
        findAll: jest.fn(),
      },
    };
    const itinerariesService = createItinerariesService({
      dbProvider: () => db,
    });

    const result = await itinerariesService.getTripItinerary(trip.userId, trip.id);

    expect(result).toEqual({
      itineraryId: null,
      tripId: trip.id,
      destinationId: trip.destinationId,
      planningMode: "manual",
      startDate: "2026-04-10",
      endDate: "2026-04-11",
      hasItinerary: false,
      days: [],
    });
  });

  test("saveTripItinerary creates itinerary rows and returns the serialized payload", async () => {
    const itinerary = {
      id: "99999999-9999-4999-8999-999999999999",
      tripId: trip.id,
    };
    const createdDay = {
      id: "88888888-8888-4888-8888-888888888888",
      itineraryId: itinerary.id,
      tripId: trip.id,
      dayNumber: 1,
      tripDate: "2026-04-10",
      notes: null,
    };
    const createdItem = {
      id: "12121212-1212-4121-8121-121212121212",
      itineraryDayId: createdDay.id,
      tripId: trip.id,
      attractionId: attraction.id,
      orderIndex: 1,
      startTime: "09:00",
      endTime: "11:00",
      notes: null,
      source: "manual",
    };
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue(trip),
      },
      Attraction: {
        findAll: jest.fn().mockResolvedValue([attraction]),
      },
      AttractionCategoryMapping: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      Itinerary: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(itinerary),
        create: jest.fn().mockResolvedValue(itinerary),
      },
      ItineraryDay: {
        findAll: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([createdDay]),
        destroy: jest.fn().mockResolvedValue(0),
        bulkCreate: jest.fn().mockResolvedValue([createdDay]),
      },
      ItineraryItem: {
        destroy: jest.fn().mockResolvedValue(0),
        bulkCreate: jest.fn().mockResolvedValue([createdItem]),
        findAll: jest.fn().mockResolvedValue([createdItem]),
      },
    };
    const itinerariesService = createItinerariesService({
      dbProvider: () => db,
    });

    const result = await itinerariesService.saveTripItinerary(trip.userId, trip.id, {
      days: [
        {
          dayNumber: 1,
          items: [
            {
              attractionId: attraction.id,
              startTime: "09:00",
              endTime: "11:00",
            },
          ],
        },
      ],
    });

    expect(db.Itinerary.create).toHaveBeenCalledWith({ tripId: trip.id }, { transaction: null });
    expect(db.ItineraryDay.bulkCreate).toHaveBeenCalledWith(
      [
        {
          itineraryId: itinerary.id,
          tripId: trip.id,
          dayNumber: 1,
          tripDate: "2026-04-10",
          notes: null,
        },
      ],
      { transaction: null, returning: true }
    );
    expect(db.ItineraryItem.bulkCreate).toHaveBeenCalledWith(
      [
        {
          itineraryDayId: createdDay.id,
          tripId: trip.id,
          attractionId: attraction.id,
          orderIndex: 1,
          startTime: "09:00",
          endTime: "11:00",
          notes: null,
          source: "manual",
        },
      ],
      { transaction: null, returning: true }
    );
    expect(result).toEqual({
      itineraryId: itinerary.id,
      tripId: trip.id,
      destinationId: trip.destinationId,
      planningMode: "manual",
      startDate: "2026-04-10",
      endDate: "2026-04-11",
      hasItinerary: true,
      days: [
        {
          id: createdDay.id,
          dayNumber: 1,
          date: "2026-04-10",
          notes: null,
          items: [
            {
              id: createdItem.id,
              attractionId: attraction.id,
              attractionName: "Pantai Nongsa",
              startTime: "09:00",
              endTime: "11:00",
              orderIndex: 1,
              notes: null,
              source: "manual",
              attraction: {
                id: attraction.id,
                destinationId: attraction.destinationId,
                name: "Pantai Nongsa",
                slug: "pantai-nongsa",
                fullAddress: "Nongsa, Batam, Kepulauan Riau, Indonesia",
                latitude: "1.1870000",
                longitude: "104.1190000",
                estimatedDurationMinutes: 120,
                rating: "4.5",
                thumbnailImageUrl:
                  "http://localhost:3000/api/attractions/33333333-3333-4333-8333-333333333333/photo?variant=thumbnail",
                mainImageUrl:
                  "http://localhost:3000/api/attractions/33333333-3333-4333-8333-333333333333/photo?variant=main",
                enrichment: {
                  externalSource: "google_places",
                  externalPlaceId: "ChIJexamplePantaiNongsa",
                },
                categories: [],
              },
            },
          ],
        },
      ],
    });
  });

  test("saveTripItinerary rejects duplicate attractions within the same trip", async () => {
    const db = {
      Trip: {
        findOne: jest.fn().mockResolvedValue(trip),
      },
      Attraction: {
        findAll: jest.fn().mockResolvedValue([attraction]),
      },
      Itinerary: {
        findOne: jest.fn(),
        create: jest.fn(),
      },
      ItineraryDay: {
        findAll: jest.fn(),
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
      ItineraryItem: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
        findAll: jest.fn(),
      },
    };
    const itinerariesService = createItinerariesService({
      dbProvider: () => db,
    });

    await expect(
      itinerariesService.saveTripItinerary(trip.userId, trip.id, {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                attractionId: attraction.id,
                startTime: "09:00",
                endTime: "11:00",
              },
            ],
          },
          {
            dayNumber: 2,
            items: [
              {
                attractionId: attraction.id,
                startTime: "09:00",
                endTime: "11:00",
              },
            ],
          },
        ],
      })
    ).rejects.toMatchObject({
      message: "The same attraction cannot appear twice in a trip itinerary.",
      statusCode: 422,
    });
  });
});
