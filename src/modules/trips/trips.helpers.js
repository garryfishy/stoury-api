const { dateDiffInDaysInclusive } = require("../../utils/date");
const { readRecordValue } = require("../../utils/model-helpers");
const { serializeDestination } = require("../destinations/destinations.helpers");
const { serializePreferenceCategory } = require("../preferences/preferences.helpers");

const getTripId = (trip) => readRecordValue(trip, ["id"]);

const serializeTrip = (trip, options = {}) => ({
  id: getTripId(trip),
  title: readRecordValue(trip, ["title"], ""),
  userId: readRecordValue(trip, ["userId"]),
  destinationId: readRecordValue(trip, ["destinationId"]),
  planningMode: readRecordValue(trip, ["planningMode"], ""),
  startDate: readRecordValue(trip, ["startDate"], ""),
  endDate: readRecordValue(trip, ["endDate"], ""),
  durationDays: dateDiffInDaysInclusive(
    readRecordValue(trip, ["startDate"]),
    readRecordValue(trip, ["endDate"])
  ),
  budget: readRecordValue(trip, ["budget"], null),
  destination: options.destination ? serializeDestination(options.destination) : undefined,
  preferences: options.preferences
    ? options.preferences.map(serializePreferenceCategory)
    : undefined,
  hasItinerary: options.hasItinerary ?? false,
});

module.exports = {
  getTripId,
  serializeTrip,
};
