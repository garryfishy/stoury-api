const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

const parseDateOnly = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const dateDiffInDaysInclusive = (startDate, endDate) => {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) {
    return null;
  }

  return Math.floor((end - start) / MILLISECONDS_IN_DAY) + 1;
};

module.exports = {
  dateDiffInDaysInclusive,
  parseDateOnly,
};
