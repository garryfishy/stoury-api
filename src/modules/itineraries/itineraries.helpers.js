const { readRecordValue } = require("../../utils/model-helpers");
const { serializeAttractionCategory } = require("../attractions/attractions.helpers");

const DEFAULT_DAY_START_MINUTES = 9 * 60;
const DEFAULT_DAY_END_MINUTES = 18 * 60;
const DEFAULT_ITEM_BUFFER_MINUTES = 30;
const DEFAULT_MAX_ITEMS_PER_DAY = 4;

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const padTimeNumber = (value) => String(value).padStart(2, "0");

const timeStringToMinutes = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const [hours, minutes] = value.split(":").map((part) => Number(part));

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const minutesToTimeString = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  const safeMinutes = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${padTimeNumber(hours)}:${padTimeNumber(minutes)}`;
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const getDateOnlyForTripDay = (startDate, dayNumber) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  start.setUTCDate(start.getUTCDate() + Number(dayNumber) - 1);
  return formatDateOnly(start);
};

const getWeekdayKey = (dateOnly) => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return WEEKDAY_KEYS[date.getUTCDay()] || null;
};

const getOpeningWindowsForDate = (openingHours, dateOnly) => {
  if (!openingHours || typeof openingHours !== "object") {
    return [];
  }

  const weekdayKey = getWeekdayKey(dateOnly);

  if (!weekdayKey || !Array.isArray(openingHours[weekdayKey])) {
    return [];
  }

  return openingHours[weekdayKey]
    .map((window) => ({
      openMinutes: timeStringToMinutes(window?.open),
      closeMinutes: timeStringToMinutes(window?.close),
    }))
    .filter(
      (window) =>
        Number.isInteger(window.openMinutes) &&
        Number.isInteger(window.closeMinutes) &&
        window.openMinutes < window.closeMinutes
    )
    .sort((left, right) => left.openMinutes - right.openMinutes);
};

const findSchedulableWindow = ({
  openingHours,
  dateOnly,
  desiredStartMinutes,
  durationMinutes,
  dailyStartMinutes = DEFAULT_DAY_START_MINUTES,
  dailyEndMinutes = DEFAULT_DAY_END_MINUTES,
}) => {
  const windows = getOpeningWindowsForDate(openingHours, dateOnly);
  const candidateWindows = windows.length
    ? windows
    : [{ openMinutes: dailyStartMinutes, closeMinutes: dailyEndMinutes }];

  for (const window of candidateWindows) {
    const startMinutes = Math.max(
      dailyStartMinutes,
      desiredStartMinutes,
      window.openMinutes
    );
    const endMinutes = startMinutes + durationMinutes;

    if (endMinutes <= Math.min(window.closeMinutes, dailyEndMinutes)) {
      return {
        startMinutes,
        endMinutes,
      };
    }
  }

  return null;
};

const isTimeWindowWithinOpeningHours = ({
  openingHours,
  dateOnly,
  startTime,
  endTime,
}) => {
  if (!startTime || !endTime) {
    return true;
  }

  const windows = getOpeningWindowsForDate(openingHours, dateOnly);

  if (!windows.length) {
    return true;
  }

  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  return windows.some(
    (window) =>
      startMinutes >= window.openMinutes && endMinutes <= window.closeMinutes
  );
};

const serializeAttractionSummary = (record, categories = []) => ({
  id: readRecordValue(record, ["id"]),
  destinationId: readRecordValue(record, ["destinationId"]),
  name: readRecordValue(record, ["name"], ""),
  slug: readRecordValue(record, ["slug"], ""),
  estimatedDurationMinutes: readRecordValue(
    record,
    ["estimatedDurationMinutes"],
    null
  ),
  rating: readRecordValue(record, ["rating"], null),
  thumbnailImageUrl: readRecordValue(record, ["thumbnailImageUrl"], null),
  mainImageUrl: readRecordValue(record, ["mainImageUrl"], null),
  categories: categories.map(serializeAttractionCategory),
});

const normalizeStoredTime = (value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  return /^\d{2}:\d{2}:\d{2}$/.test(value) ? value.slice(0, 5) : value;
};

const buildItineraryItemPayload = (
  itemRecord,
  attractionsById,
  categoriesByAttractionId
) => {
  const attractionId = readRecordValue(itemRecord, ["attractionId"]);
  const attraction = attractionsById.get(attractionId);

  return {
    id: readRecordValue(itemRecord, ["id"]),
    attractionId,
    attractionName: readRecordValue(attraction, ["name"], ""),
    startTime: normalizeStoredTime(readRecordValue(itemRecord, ["startTime"], null)),
    endTime: normalizeStoredTime(readRecordValue(itemRecord, ["endTime"], null)),
    orderIndex: readRecordValue(itemRecord, ["orderIndex"]),
    notes: readRecordValue(itemRecord, ["notes"], null),
    source: readRecordValue(itemRecord, ["source"], "manual"),
    attraction: attraction
      ? serializeAttractionSummary(
          attraction,
          categoriesByAttractionId.get(attractionId) || []
        )
      : null,
  };
};

const buildItineraryPayload = ({
  trip,
  itinerary,
  days,
  itemsByDayId,
  attractionsById,
  categoriesByAttractionId,
}) => ({
  itineraryId: itinerary ? readRecordValue(itinerary, ["id"]) : null,
  tripId: readRecordValue(trip, ["id"]),
  destinationId: readRecordValue(trip, ["destinationId"]),
  planningMode: readRecordValue(trip, ["planningMode"], ""),
  startDate: readRecordValue(trip, ["startDate"], ""),
  endDate: readRecordValue(trip, ["endDate"], ""),
  hasItinerary: Boolean(itinerary),
  days: days.map((day) => ({
    id: readRecordValue(day, ["id"]),
    dayNumber: readRecordValue(day, ["dayNumber"]),
    date: readRecordValue(day, ["tripDate"], null),
    notes: readRecordValue(day, ["notes"], null),
    items: (itemsByDayId.get(readRecordValue(day, ["id"])) || []).map((item) =>
      buildItineraryItemPayload(item, attractionsById, categoriesByAttractionId)
    ),
  })),
});

module.exports = {
  DEFAULT_DAY_END_MINUTES,
  DEFAULT_DAY_START_MINUTES,
  DEFAULT_ITEM_BUFFER_MINUTES,
  DEFAULT_MAX_ITEMS_PER_DAY,
  buildItineraryPayload,
  findSchedulableWindow,
  getDateOnlyForTripDay,
  getOpeningWindowsForDate,
  getWeekdayKey,
  isTimeWindowWithinOpeningHours,
  minutesToTimeString,
  normalizeStoredTime,
  serializeAttractionSummary,
  timeStringToMinutes,
};
