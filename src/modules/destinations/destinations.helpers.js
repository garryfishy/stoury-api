const { readRecordValue } = require("../../utils/model-helpers");

const UUID_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuidIdentifier = (value) => UUID_IDENTIFIER_PATTERN.test(String(value));

const serializeDestination = (record) => ({
  id: readRecordValue(record, ["id"]),
  name: readRecordValue(record, ["name"], ""),
  slug: readRecordValue(record, ["slug"], ""),
  description: readRecordValue(record, ["description"], ""),
  destinationType: readRecordValue(record, ["destinationType"], ""),
  countryCode: readRecordValue(record, ["countryCode"], "ID"),
  countryName: readRecordValue(record, ["countryName"], "Indonesia"),
  provinceName: readRecordValue(record, ["provinceName"], null),
  cityName: readRecordValue(record, ["cityName"], null),
  regionName: readRecordValue(record, ["regionName"], null),
  heroImageUrl: readRecordValue(record, ["heroImageUrl"], null),
  metadata: readRecordValue(record, ["metadata"], {}),
});

const findDestinationByIdOrSlug = async (Destination, idOrSlug) => {
  if (isUuidIdentifier(idOrSlug)) {
    return Destination.findOne({
      where: { id: String(idOrSlug), isActive: true },
    });
  }

  return Destination.findOne({
    where: { slug: idOrSlug, isActive: true },
  });
};

module.exports = {
  findDestinationByIdOrSlug,
  isUuidIdentifier,
  serializeDestination,
};
