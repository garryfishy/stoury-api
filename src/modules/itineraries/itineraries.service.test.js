const { createItinerariesService } = require("./itineraries.service");
const { createMockDb } = require("../../test-utils/mock-sequelize-db");

const USER_ID = "01010101-0101-4101-8101-010101010101";
const TRIP_ID = "02020202-0202-4202-8202-020202020202";
const DESTINATION_ID = "03030303-0303-4303-8303-030303030303";
const OTHER_DESTINATION_ID = "04040404-0404-4404-8404-040404040404";
const MUSEUM_ID = "05050505-0505-4505-8505-050505050505";
const MARKET_ID = "06060606-0606-4606-8606-060606060606";
const OTHER_DESTINATION_ATTRACTION_ID = "07070707-0707-4707-8707-070707070707";

const alwaysOpen = {
  monday: [{ open: "08:00", close: "18:00" }],
  tuesday: [{ open: "08:00", close: "18:00" }],
  wednesday: [{ open: "08:00", close: "18:00" }],
  thursday: [{ open: "08:00", close: "18:00" }],
  friday: [{ open: "08:00", close: "18:00" }],
  saturday: [{ open: "08:00", close: "18:00" }],
  sunday: [{ open: "08:00", close: "18:00" }],
};

const createService = () => {
  const db = createMockDb({
    trips: [
      {
        id: TRIP_ID,
        userId: USER_ID,
        destinationId: DESTINATION_ID,
        planningMode: "manual",
        startDate: "2026-05-10",
        endDate: "2026-05-12",
      },
    ],
    attractions: [
      {
        id: MUSEUM_ID,
        destinationId: DESTINATION_ID,
        name: "City Museum",
        slug: "city-museum",
        estimatedDurationMinutes: 120,
        rating: 4.6,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
      },
      {
        id: MARKET_ID,
        destinationId: DESTINATION_ID,
        name: "Night Market",
        slug: "night-market",
        estimatedDurationMinutes: 90,
        rating: 4.4,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
      },
      {
        id: OTHER_DESTINATION_ATTRACTION_ID,
        destinationId: OTHER_DESTINATION_ID,
        name: "Other Destination Attraction",
        slug: "other-destination-attraction",
        estimatedDurationMinutes: 60,
        rating: 4.0,
        openingHours: alwaysOpen,
        thumbnailImageUrl: null,
        mainImageUrl: null,
      },
    ],
  });

  return {
    db,
    service: createItinerariesService({
      dbProvider: () => db,
    }),
  };
};

describe("itinerariesService", () => {
  test("saves and reloads a full itinerary inside one transaction", async () => {
    const { service } = createService();

    const saved = await service.saveTripItinerary(USER_ID, TRIP_ID, {
      days: [
        {
          dayNumber: 1,
          date: "2026-05-10",
          items: [
            {
              attractionId: MUSEUM_ID,
              startTime: "09:00",
              endTime: "11:00",
            },
          ],
        },
        {
          dayNumber: 2,
          date: "2026-05-11",
          items: [
            {
              attractionId: MARKET_ID,
              startTime: "13:00",
              endTime: "14:30",
              source: "manual",
            },
          ],
        },
      ],
    });

    expect(saved.hasItinerary).toBe(true);
    expect(saved.days).toHaveLength(2);
    expect(saved.days[0].items[0].attractionName).toBe("City Museum");
    expect(saved.days[1].items[0].attractionId).toBe(MARKET_ID);

    const fetched = await service.getTripItinerary(USER_ID, TRIP_ID);

    expect(fetched.itineraryId).toBeTruthy();
    expect(fetched.days).toHaveLength(2);
    expect(fetched.days[1].date).toBe("2026-05-11");
    expect(fetched.days[0].items[0].attraction.thumbnailImageUrl).toBe(
      `http://localhost:3000/api/attractions/${MUSEUM_ID}/photo?variant=thumbnail`
    );
    expect(fetched.days[0].items[0].attraction.mainImageUrl).toBe(
      `http://localhost:3000/api/attractions/${MUSEUM_ID}/photo?variant=main`
    );
    expect(fetched.days[0].items[0].attraction.openingHours).toEqual(alwaysOpen);
    expect(fetched.days[0].items[0].attraction.tripDayOpeningHours).toEqual([
      { open: "08:00", close: "18:00" },
    ]);
    expect(fetched.days[0].items[0].attraction.tripDayIsOpen).toBe(true);
    expect(fetched.days[0].items[0].attraction.primaryPreference).toEqual({
      slug: "popular",
      name: "Populer",
    });
  });

  test("rejects duplicate attractions anywhere in the trip payload", async () => {
    const { service } = createService();

    await expect(
      service.saveTripItinerary(USER_ID, TRIP_ID, {
        days: [
          {
            dayNumber: 1,
            date: "2026-05-10",
            items: [{ attractionId: MUSEUM_ID }],
          },
          {
            dayNumber: 2,
            date: "2026-05-11",
            items: [{ attractionId: MUSEUM_ID }],
          },
        ],
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "The same attraction cannot appear twice in a trip itinerary.",
        statusCode: 422,
      })
    );
  });

  test("rejects a client-supplied day date that does not match the trip calendar", async () => {
    const { service } = createService();

    await expect(
      service.saveTripItinerary(USER_ID, TRIP_ID, {
        days: [
          {
            dayNumber: 1,
            date: "2026-05-11",
            items: [{ attractionId: MUSEUM_ID }],
          },
        ],
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Itinerary day 1 must use date 2026-05-10.",
        statusCode: 422,
      })
    );
  });

  test("allows items without times and preserves ordering by orderIndex", async () => {
    const { service } = createService();

    const saved = await service.saveTripItinerary(USER_ID, TRIP_ID, {
      days: [
        {
          dayNumber: 1,
          items: [
            {
              attractionId: MARKET_ID,
              orderIndex: 1,
            },
            {
              attractionId: MUSEUM_ID,
              orderIndex: 2,
            },
          ],
        },
      ],
    });

    expect(saved.days[0].items[0].attractionId).toBe(MARKET_ID);
    expect(saved.days[0].items[0].startTime).toBeNull();
    expect(saved.days[0].items[1].attractionId).toBe(MUSEUM_ID);
    expect(saved.days[0].items[1].endTime).toBeNull();
  });

  test("rejects attractions from another destination", async () => {
    const { service } = createService();

    await expect(
      service.saveTripItinerary(USER_ID, TRIP_ID, {
        days: [
          {
            dayNumber: 1,
            items: [{ attractionId: OTHER_DESTINATION_ATTRACTION_ID }],
          },
        ],
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: `Attraction ${OTHER_DESTINATION_ATTRACTION_ID} belongs to another destination.`,
        statusCode: 422,
      })
    );
  });
});
