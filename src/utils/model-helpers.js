const readRecordValue = (record, keys, fallback = null) => {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return fallback;
};

const buildAliasedPayload = (mapping) => {
  const payload = {};

  for (const [value, aliases] of mapping) {
    if (value === undefined) {
      continue;
    }

    for (const alias of aliases) {
      payload[alias] = value;
    }
  }

  return payload;
};

module.exports = {
  buildAliasedPayload,
  readRecordValue,
};
