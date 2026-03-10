require("./test-env");

const { Op } = require("sequelize");
const db = require("../../../src/database/models");

const TEST_EMAIL_PREFIX = "qa-int-";

const buildTestEmailPattern = () => `${TEST_EMAIL_PREFIX}%@example.com`;

const ensureTestDbReady = async () => {
  await db.sequelize.authenticate();

  const [
    destinationCount,
    activeDestinationCount,
    attractionCount,
    preferenceCategoryCount,
    attractionCategoryCount,
  ] = await Promise.all([
    db.Destination.count(),
    db.Destination.count({ where: { isActive: true } }),
    db.Attraction.count({ where: { isActive: true } }),
    db.PreferenceCategory.count({ where: { isActive: true } }),
    db.AttractionCategory.count({ where: { isActive: true } }),
  ]);

  expect(destinationCount).toBeGreaterThanOrEqual(3);
  expect(activeDestinationCount).toBeGreaterThanOrEqual(1);
  expect(attractionCount).toBeGreaterThanOrEqual(72);
  expect(preferenceCategoryCount).toBeGreaterThanOrEqual(8);
  expect(attractionCategoryCount).toBeGreaterThanOrEqual(10);
};

const findTestUsers = async () =>
  db.User.findAll({
    where: {
      email: {
        [Op.like]: buildTestEmailPattern(),
      },
    },
  });

const cleanupTestArtifacts = async () => {
  const users = await findTestUsers();
  const userIds = users.map((user) => user.id);

  if (!userIds.length) {
    return;
  }

  const trips = await db.Trip.findAll({
    where: {
      userId: {
        [Op.in]: userIds,
      },
    },
  });
  const tripIds = trips.map((trip) => trip.id);

  const itineraries = tripIds.length
    ? await db.Itinerary.findAll({
        where: {
          tripId: {
            [Op.in]: tripIds,
          },
        },
      })
    : [];
  const itineraryIds = itineraries.map((itinerary) => itinerary.id);

  const itineraryDays = itineraryIds.length
    ? await db.ItineraryDay.findAll({
        where: {
          itineraryId: {
            [Op.in]: itineraryIds,
          },
        },
      })
    : [];
  const itineraryDayIds = itineraryDays.map((day) => day.id);

  if (itineraryDayIds.length) {
    await db.ItineraryItem.destroy({
      where: {
        itineraryDayId: {
          [Op.in]: itineraryDayIds,
        },
      },
    });
  }

  if (tripIds.length) {
    await db.ItineraryItem.destroy({
      where: {
        tripId: {
          [Op.in]: tripIds,
        },
      },
    });
    await db.ItineraryDay.destroy({
      where: {
        tripId: {
          [Op.in]: tripIds,
        },
      },
    });
    await db.TripPreferenceCategory.destroy({
      where: {
        tripId: {
          [Op.in]: tripIds,
        },
      },
    });
    await db.Itinerary.destroy({
      where: {
        tripId: {
          [Op.in]: tripIds,
        },
      },
    });
    await db.Trip.destroy({
      where: {
        id: {
          [Op.in]: tripIds,
        },
      },
    });
  }

  await db.RefreshToken.destroy({
    where: {
      userId: {
        [Op.in]: userIds,
      },
    },
  });
  await db.UserPreferenceCategory.destroy({
    where: {
      userId: {
        [Op.in]: userIds,
      },
    },
  });
  await db.UserRole.destroy({
    where: {
      userId: {
        [Op.in]: userIds,
      },
    },
  });
  await db.User.destroy({
    where: {
      id: {
        [Op.in]: userIds,
      },
    },
  });
};

const closeTestDb = async () => {
  await db.sequelize.close();
};

module.exports = {
  TEST_EMAIL_PREFIX,
  cleanupTestArtifacts,
  closeTestDb,
  db,
  ensureTestDbReady,
};
