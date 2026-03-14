const WEEKDAY_KEYS = Object.freeze([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const LEGACY_RANGE_PATTERN =
  /^\s*(([01]\d|2[0-3]):[0-5]\d)\s*-\s*(([01]\d|2[0-3]):[0-5]\d)\s*$/;

const isValidTimeRange = (open, close) =>
  TIME_PATTERN.test(open) && TIME_PATTERN.test(close) && open < close;

const normalizeOpeningWindow = (window) => {
  if (!window) {
    return null;
  }

  if (typeof window === "string") {
    const match = LEGACY_RANGE_PATTERN.exec(window);

    if (!match) {
      return null;
    }

    const open = match[1];
    const close = match[3];

    return isValidTimeRange(open, close) ? { open, close } : null;
  }

  if (typeof window !== "object" || Array.isArray(window)) {
    return null;
  }

  const open = String(window.open || "").trim();
  const close = String(window.close || "").trim();

  return isValidTimeRange(open, close) ? { open, close } : null;
};

const normalizeOpeningWindows = (windows) => {
  if (Array.isArray(windows)) {
    return windows.map(normalizeOpeningWindow).filter(Boolean);
  }

  const singleWindow = normalizeOpeningWindow(windows);

  return singleWindow ? [singleWindow] : [];
};

const normalizeOpeningHours = (openingHours) => {
  if (!openingHours || typeof openingHours !== "object" || Array.isArray(openingHours)) {
    return null;
  }

  return WEEKDAY_KEYS.reduce((result, weekdayKey) => {
    result[weekdayKey] = normalizeOpeningWindows(openingHours[weekdayKey]);
    return result;
  }, {});
};

module.exports = {
  normalizeOpeningHours,
  normalizeOpeningWindow,
  normalizeOpeningWindows,
  WEEKDAY_KEYS,
};
