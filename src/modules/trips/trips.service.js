const { Op } = require("sequelize");
const { getDb, getRequiredModel, withTransaction } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const { findDestinationByIdOrSlug } = require("../destinations/destinations.helpers");
const {
  loadPreferenceCategoriesByIds,
  loadUserPreferenceCategories,
} = require("../preferences/preferences.helpers");
const { getTripId, serializeTrip } = require("./trips.helpers");

const createTripsService = ({ dbProvider = getDb } = {}) => {
  const getTripModels = (db) => ({
    Destination: getRequiredModel(db, "Destination"),
    Itinerary: db.Itinerary || null,
    Trip: getRequiredModel(db, "Trip"),
    TripPreferenceCategory: getRequiredModel(db, "TripPreferenceCategory"),
  });

  const assertDestinationExists = async (Destination, destinationId, transaction) => {
    const destination = await findDestinationByIdOrSlug(Destination, String(destinationId));

    if (!destination) {
      throw new AppError("Destination not found.", 422);
    }

    return destination;
  };

  const assertNoOverlap = async (Trip, { tripId, userId, destinationId, startDate, endDate }, transaction) => {
    const where = {
      [Op.and]: [
        {
          userId,
        },
        {
          destinationId,
        },
        {
          startDate: { [Op.lte]: endDate },
        },
        {
          endDate: { [Op.gte]: startDate },
        },
      ],
    };

    if (tripId) {
      where[Op.and].push({
        [Op.or]: [{ id: { [Op.ne]: tripId } }],
      });
    }

    const overlap = await Trip.findOne({ where, transaction });

    if (overlap) {
      throw new AppError(
        "You already have an overlapping trip for this destination in the selected date range.",
        409
      );
    }
  };

  const assertValidDateRange = (startDate, endDate) => {
    if (startDate && endDate && String(startDate) > String(endDate)) {
      throw new AppError("startDate must be on or before endDate.", 422);
    }
  };

  const resolvePreferenceSnapshot = async (
    db,
    { userId, preferenceSource, preferenceCategoryIds },
    transaction
  ) => {
    if (preferenceSource === "profile") {
      return loadUserPreferenceCategories(db, userId, transaction);
    }

    const categories = await loadPreferenceCategoriesByIds(
      db,
      preferenceCategoryIds || [],
      transaction
    );

    if (categories.length !== (preferenceCategoryIds || []).length) {
      throw new AppError("One or more trip preference categories do not exist.", 422);
    }

    return categories;
  };

  const replaceTripPreferences = async (TripPreferenceCategory, tripId, categories, transaction) => {
    await TripPreferenceCategory.destroy({
      where: { tripId },
      transaction,
    });

    if (!categories.length) {
      return;
    }

    await TripPreferenceCategory.bulkCreate(
      categories.map((category) => ({
        tripId,
        preferenceCategoryId: readRecordValue(category, ["id"]),
      })),
      { transaction }
    );
  };

  const loadTripPreferences = async (db, tripId) => {
    const TripPreferenceCategory = db.TripPreferenceCategory;
    const PreferenceCategory = db.PreferenceCategory;

    const mappings = await TripPreferenceCategory.findAll({
      where: { tripId },
    });

    const categoryIds = mappings
      .map((mapping) => readRecordValue(mapping, ["preferenceCategoryId"]))
      .filter(Boolean);

    if (!categoryIds.length) {
      return [];
    }

    return PreferenceCategory.findAll({
      where: { id: categoryIds },
      order: [["name", "ASC"]],
    });
  };

  const loadDestinationMap = async (Destination, trips) => {
    const destinationIds = [
      ...new Set(
        trips
          .map((trip) => readRecordValue(trip, ["destinationId"]))
          .filter(Boolean)
      ),
    ];

    if (!destinationIds.length) {
      return new Map();
    }

    const destinations = await Destination.findAll({
      where: { id: destinationIds },
    });

    return new Map(destinations.map((destination) => [readRecordValue(destination, ["id"]), destination]));
  };

  const assertOwnership = async (Trip, userId, tripId) => {
    const trip = await Trip.findOne({
      where: {
        [Op.and]: [
          { id: tripId },
          { userId },
        ],
      },
    });

    if (!trip) {
      throw new AppError("Trip not found.", 404);
    }

    return trip;
  };

  const hasExistingItinerary = async (Itinerary, tripId) => {
    if (!Itinerary) {
      return false;
    }

    const itinerary = await Itinerary.findOne({
      where: { tripId },
    });

    return Boolean(itinerary);
  };

  return {
    async createTrip(userId, payload) {
      const db = dbProvider();
      const { Destination, Trip, TripPreferenceCategory } = getTripModels(db);

      return withTransaction(async (transaction) => {
        const destination = await assertDestinationExists(
          Destination,
          payload.destinationId,
          transaction
        );
        const categories = await resolvePreferenceSnapshot(
          db,
          {
            userId,
            preferenceSource: payload.preferenceSource,
            preferenceCategoryIds: payload.preferenceCategoryIds,
          },
          transaction
        );
        assertValidDateRange(payload.startDate, payload.endDate);

        await assertNoOverlap(
          Trip,
          {
            userId,
            destinationId: payload.destinationId,
            startDate: payload.startDate,
            endDate: payload.endDate,
          },
          transaction
        );

        const trip = await Trip.create(
          {
            userId,
            destinationId: payload.destinationId,
            title: payload.title,
            planningMode: payload.planningMode,
            startDate: payload.startDate,
            endDate: payload.endDate,
            budget: payload.budget,
          },
          { transaction }
        );

        await replaceTripPreferences(TripPreferenceCategory, getTripId(trip), categories, transaction);

        return serializeTrip(trip, {
          destination,
          preferences: categories,
          hasItinerary: false,
        });
      }, db);
    },

    async listMyTrips(userId) {
      const db = dbProvider();
      const { Destination, Itinerary, Trip } = getTripModels(db);

      const trips = await Trip.findAll({
        where: {
          userId,
        },
        order: [["created_at", "DESC"]],
      });

      const destinationMap = await loadDestinationMap(Destination, trips);
      let itineraryTripIds = new Set();

      if (Itinerary && trips.length) {
        const itineraryRecords = await Itinerary.findAll({
          where: {
            [Op.or]: [
              { tripId: trips.map(getTripId) },
            ],
          },
        });

        itineraryTripIds = new Set(
          itineraryRecords.map((record) => readRecordValue(record, ["tripId"]))
        );
      }

      return trips.map((trip) =>
        serializeTrip(trip, {
          destination: destinationMap.get(
            readRecordValue(trip, ["destinationId"])
          ),
          hasItinerary: itineraryTripIds.has(getTripId(trip)),
        })
      );
    },

    async getTripDetail(userId, tripId) {
      const db = dbProvider();
      const { Destination, Itinerary, Trip } = getTripModels(db);

      const trip = await assertOwnership(Trip, userId, tripId);
      const destinationId = readRecordValue(trip, ["destinationId"]);
      const destination = await assertDestinationExists(Destination, destinationId);
      const preferences = await loadTripPreferences(db, tripId);
      const hasItinerary = await hasExistingItinerary(Itinerary, tripId);

      return serializeTrip(trip, {
        destination,
        preferences,
        hasItinerary,
      });
    },

    async updateTrip(userId, tripId, payload) {
      const db = dbProvider();
      const { Destination, Itinerary, Trip, TripPreferenceCategory } = getTripModels(db);

      return withTransaction(async (transaction) => {
        const trip = await assertOwnership(Trip, userId, tripId);
        const existingDestinationId = readRecordValue(trip, ["destinationId"]);
        const nextDestinationId = payload.destinationId ?? existingDestinationId;
        const nextStartDate = payload.startDate ?? readRecordValue(trip, ["startDate"]);
        const nextEndDate = payload.endDate ?? readRecordValue(trip, ["endDate"]);
        const itineraryExists = await hasExistingItinerary(Itinerary, tripId);

        const restrictedFieldUpdated =
          payload.destinationId !== undefined ||
          payload.planningMode !== undefined ||
          payload.startDate !== undefined ||
          payload.endDate !== undefined;

        if (itineraryExists && restrictedFieldUpdated) {
          throw new AppError(
            "Trips with an existing itinerary can only update title, budget, and preference snapshots in MVP.",
            409
          );
        }

        const destination = await assertDestinationExists(Destination, nextDestinationId, transaction);
        assertValidDateRange(nextStartDate, nextEndDate);

        await assertNoOverlap(
          Trip,
          {
            tripId,
            userId,
            destinationId: nextDestinationId,
            startDate: nextStartDate,
            endDate: nextEndDate,
          },
          transaction
        );

        if (payload.preferenceSource) {
          const categories = await resolvePreferenceSnapshot(
            db,
            {
              userId,
              preferenceSource: payload.preferenceSource,
              preferenceCategoryIds: payload.preferenceCategoryIds,
            },
            transaction
          );

          await replaceTripPreferences(TripPreferenceCategory, tripId, categories, transaction);
        }

        await trip.update(
          {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.destinationId !== undefined
              ? { destinationId: payload.destinationId }
              : {}),
            ...(payload.planningMode !== undefined
              ? { planningMode: payload.planningMode }
              : {}),
            ...(payload.startDate !== undefined ? { startDate: payload.startDate } : {}),
            ...(payload.endDate !== undefined ? { endDate: payload.endDate } : {}),
            ...(payload.budget !== undefined ? { budget: payload.budget } : {}),
          },
          { transaction }
        );

        const preferences = await loadTripPreferences(db, tripId);

        return serializeTrip(trip, {
          destination,
          preferences,
          hasItinerary: itineraryExists,
        });
      }, db);
    },
  };
};

const tripsService = createTripsService();

module.exports = {
  createTripsService,
  tripsService,
};
