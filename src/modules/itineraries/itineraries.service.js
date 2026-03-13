const { Op } = require("sequelize");
const { dateDiffInDaysInclusive } = require("../../utils/date");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const { getDb, getRequiredModel, withTransaction } = require("../../database/db-context");
const {
  loadAttractionCategoriesByAttractionIds,
} = require("../attractions/attractions.helpers");
const {
  buildItineraryPayload,
  getDateOnlyForTripDay,
  isTimeWindowWithinOpeningHours,
  timeStringToMinutes,
} = require("./itineraries.helpers");
const { itineraryResponseSchema } = require("./itineraries.validators");

const normalizeUuidValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const createItinerariesService = ({ dbProvider = getDb } = {}) => {
  const getItineraryModels = (db) => ({
    Attraction: getRequiredModel(db, "Attraction"),
    Itinerary: getRequiredModel(db, "Itinerary"),
    ItineraryDay: getRequiredModel(db, "ItineraryDay"),
    ItineraryItem: getRequiredModel(db, "ItineraryItem"),
    Trip: getRequiredModel(db, "Trip"),
  });

  const assertTripOwnership = async (Trip, userId, tripId, transaction) => {
    const trip = await Trip.findOne({
      where: {
        id: tripId,
        userId,
      },
      transaction,
    });

    if (!trip) {
      throw new AppError("Trip not found.", 404);
    }

    return trip;
  };

  const getTripDurationDays = (trip) =>
    dateDiffInDaysInclusive(
      readRecordValue(trip, ["startDate"]),
      readRecordValue(trip, ["endDate"])
    );

  const normalizeDayPayloads = (trip, payload) => {
    const durationDays = getTripDurationDays(trip);
    const tripStartDate = readRecordValue(trip, ["startDate"]);
    const sortedDays = [...payload.days].sort((left, right) => left.dayNumber - right.dayNumber);

    if (!durationDays) {
      throw new AppError("Trip dates are invalid.", 422);
    }

    if (sortedDays.length > durationDays) {
      throw new AppError(
        "Itinerary day count exceeds the trip date range.",
        422
      );
    }

    const normalizedDays = sortedDays.map((day, dayIndex) => {
      const expectedDayNumber = dayIndex + 1;

      if (day.dayNumber !== expectedDayNumber) {
        throw new AppError(
          "Itinerary days must be sequential starting at 1.",
          422
        );
      }

      const tripDate = getDateOnlyForTripDay(tripStartDate, day.dayNumber);

      if (!tripDate) {
        throw new AppError("Unable to derive itinerary day dates from the trip.", 500);
      }

      if (day.date && day.date !== tripDate) {
        throw new AppError(
          `Itinerary day ${day.dayNumber} must use date ${tripDate}.`,
          422
        );
      }

      const sortedItems = day.items
        .map((item, itemIndex) => ({
          attractionId: normalizeUuidValue(item.attractionId),
          orderIndex: item.orderIndex ?? itemIndex + 1,
          startTime: item.startTime ?? null,
          endTime: item.endTime ?? null,
          notes: item.notes ?? null,
          estimatedBudgetMin: item.estimatedBudgetMin ?? null,
          estimatedBudgetMax: item.estimatedBudgetMax ?? null,
          estimatedBudgetNote: item.estimatedBudgetNote ?? null,
          source: item.source ?? "manual",
        }))
        .sort((left, right) => left.orderIndex - right.orderIndex);

      sortedItems.forEach((item, itemIndex) => {
        const expectedOrderIndex = itemIndex + 1;

        if (item.orderIndex !== expectedOrderIndex) {
          throw new AppError(
            `Itinerary items for day ${day.dayNumber} must use sequential orderIndex values starting at 1.`,
            422
          );
        }

        const previousItem = sortedItems[itemIndex - 1];

        if (
          previousItem?.endTime &&
          item.startTime &&
          timeStringToMinutes(item.startTime) <
            timeStringToMinutes(previousItem.endTime)
        ) {
          throw new AppError(
            `Itinerary item times for day ${day.dayNumber} overlap.`,
            422
          );
        }
      });

      return {
        dayNumber: day.dayNumber,
        date: tripDate,
        notes: day.notes ?? null,
        items: sortedItems,
      };
    });

    return normalizedDays;
  };

  const assertAttractionsValidForTrip = (trip, attractionsById, normalizedDays) => {
    const tripDestinationId = readRecordValue(trip, ["destinationId"]);
    const usedAttractionIds = new Set();

    normalizedDays.forEach((day) => {
      day.items.forEach((item) => {
        if (usedAttractionIds.has(item.attractionId)) {
          throw new AppError(
            "The same attraction cannot appear twice in a trip itinerary.",
            422
          );
        }

        usedAttractionIds.add(item.attractionId);

        const attraction = attractionsById.get(item.attractionId);

        if (!attraction) {
          throw new AppError(
            `Attraction ${item.attractionId} does not exist.`,
            422
          );
        }

        if (readRecordValue(attraction, ["destinationId"]) !== tripDestinationId) {
          throw new AppError(
            `Attraction ${item.attractionId} belongs to another destination.`,
            422
          );
        }

        if (
          !isTimeWindowWithinOpeningHours({
            openingHours: readRecordValue(attraction, ["openingHours"], {}),
            dateOnly: day.date,
            startTime: item.startTime,
            endTime: item.endTime,
          })
        ) {
          throw new AppError(
            `Attraction ${item.attractionId} is outside its opening hours on day ${day.dayNumber}.`,
            422
          );
        }
      });
    });
  };

  const loadAttractionsByIds = async (Attraction, attractionIds, transaction) => {
    if (!attractionIds.length) {
      return [];
    }

    return Attraction.findAll({
      where: {
        id: {
          [Op.in]: attractionIds.map(normalizeUuidValue),
        },
      },
      transaction,
    });
  };

  const loadSerializedItinerary = async (db, trip, transaction) => {
    const { Attraction, Itinerary, ItineraryDay, ItineraryItem } = getItineraryModels(db);
    const tripId = readRecordValue(trip, ["id"]);
    const itinerary = await Itinerary.findOne({
      where: { tripId },
      transaction,
    });

    if (!itinerary) {
      return itineraryResponseSchema.parse(
        buildItineraryPayload({
          trip,
          itinerary: null,
          days: [],
          itemsByDayId: new Map(),
          attractionsById: new Map(),
          categoriesByAttractionId: new Map(),
        })
      );
    }

    const days = await ItineraryDay.findAll({
      where: { itineraryId: readRecordValue(itinerary, ["id"]) },
      order: [["dayNumber", "ASC"]],
      transaction,
    });
    const dayIds = days.map((day) => readRecordValue(day, ["id"]));

    const items = dayIds.length
      ? await ItineraryItem.findAll({
          where: {
            itineraryDayId: {
              [Op.in]: dayIds,
            },
          },
          order: [
            ["itineraryDayId", "ASC"],
            ["orderIndex", "ASC"],
          ],
          transaction,
        })
      : [];

    const attractionIds = [
      ...new Set(
        items
          .map((item) => normalizeUuidValue(readRecordValue(item, ["attractionId"])))
          .filter(Boolean)
      ),
    ];
    const attractions = await loadAttractionsByIds(Attraction, attractionIds, transaction);
    const attractionsById = new Map(
      attractions.map((attraction) => [
        normalizeUuidValue(readRecordValue(attraction, ["id"])),
        attraction,
      ])
    );
    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      attractionIds
    );
    const itemsByDayId = new Map();

    items.forEach((item) => {
      const itineraryDayId = readRecordValue(item, ["itineraryDayId"]);

      if (!itemsByDayId.has(itineraryDayId)) {
        itemsByDayId.set(itineraryDayId, []);
      }

      itemsByDayId.get(itineraryDayId).push(item);
    });

    return itineraryResponseSchema.parse(
      buildItineraryPayload({
        trip,
        itinerary,
        days,
        itemsByDayId,
        attractionsById,
        categoriesByAttractionId,
      })
    );
  };

  return {
    async getTripItinerary(userId, tripId) {
      const db = dbProvider();
      const { Trip } = getItineraryModels(db);
      const trip = await assertTripOwnership(Trip, userId, tripId);

      return loadSerializedItinerary(db, trip);
    },

    async saveTripItinerary(userId, tripId, payload) {
      const db = dbProvider();
      const { Attraction, Itinerary, ItineraryDay, ItineraryItem, Trip } =
        getItineraryModels(db);

      return withTransaction(async (transaction) => {
        const trip = await assertTripOwnership(Trip, userId, tripId, transaction);
        const normalizedDays = normalizeDayPayloads(trip, payload);
        const attractionIds = [
          ...new Set(
            normalizedDays
              .flatMap((day) => day.items.map((item) => item.attractionId))
              .filter(Boolean)
          ),
        ];
        const attractions = await loadAttractionsByIds(
          Attraction,
          attractionIds,
          transaction
        );
        const attractionsById = new Map(
          attractions.map((attraction) => [
            normalizeUuidValue(readRecordValue(attraction, ["id"])),
            attraction,
          ])
        );

        assertAttractionsValidForTrip(trip, attractionsById, normalizedDays);

        let itinerary = await Itinerary.findOne({
          where: { tripId },
          transaction,
        });

        if (!itinerary) {
          itinerary = await Itinerary.create({ tripId }, { transaction });
        }

        const itineraryId = readRecordValue(itinerary, ["id"]);
        const existingDays = await ItineraryDay.findAll({
          where: { itineraryId },
          transaction,
        });
        const existingDayIds = existingDays
          .map((day) => readRecordValue(day, ["id"]))
          .filter(Boolean);

        if (existingDayIds.length) {
          await ItineraryItem.destroy({
            where: {
              itineraryDayId: {
                [Op.in]: existingDayIds,
              },
            },
            transaction,
          });
        }

        await ItineraryDay.destroy({
          where: { itineraryId },
          transaction,
        });

        const createdDays = await ItineraryDay.bulkCreate(
          normalizedDays.map((day) => ({
            itineraryId,
            tripId,
            dayNumber: day.dayNumber,
            tripDate: day.date,
            notes: day.notes,
          })),
          {
            transaction,
            returning: true,
          }
        );
        const createdDaysByNumber = new Map(
          createdDays.map((day) => [readRecordValue(day, ["dayNumber"]), day])
        );
        const itemRows = normalizedDays.flatMap((day) =>
          day.items.map((item) => ({
            itineraryDayId: readRecordValue(
              createdDaysByNumber.get(day.dayNumber),
              ["id"]
            ),
            tripId,
            attractionId: item.attractionId,
            orderIndex: item.orderIndex,
            startTime: item.startTime,
            endTime: item.endTime,
            notes: item.notes,
            estimatedBudgetMin: item.estimatedBudgetMin,
            estimatedBudgetMax: item.estimatedBudgetMax,
            estimatedBudgetNote: item.estimatedBudgetNote,
            source: item.source,
          }))
        );

        if (itemRows.length) {
          await ItineraryItem.bulkCreate(itemRows, {
            transaction,
            returning: true,
          });
        }

        return loadSerializedItinerary(db, trip, transaction);
      }, db);
    },
  };
};

const itinerariesService = createItinerariesService();

module.exports = {
  createItinerariesService,
  itinerariesService,
};
