const { Op } = require("sequelize");

let generatedIdCounter = 1;

const sortRows = (rows, order = []) => {
  if (!Array.isArray(order) || !order.length) {
    return [...rows];
  }

  return [...rows].sort((left, right) => {
    for (const [field, direction] of order) {
      if (left[field] < right[field]) {
        return direction === "DESC" ? 1 : -1;
      }

      if (left[field] > right[field]) {
        return direction === "DESC" ? -1 : 1;
      }
    }

    return 0;
  });
};

const matchesWhere = (record, where = {}) =>
  Object.entries(where).every(([key, value]) => {
    if (Array.isArray(value)) {
      return value.includes(record[key]);
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.prototype.hasOwnProperty.call(value, Op.in)) {
        return value[Op.in].includes(record[key]);
      }
    }

    return record[key] === value;
  });

const nextMockUuid = () => {
  const suffix = String(generatedIdCounter.toString(16)).padStart(12, "0");
  generatedIdCounter += 1;

  return `00000000-0000-4000-8000-${suffix}`;
};

const createCollectionModel = (rows) => ({
  async findOne({ where = {} } = {}) {
    return rows.find((row) => matchesWhere(row, where)) || null;
  },

  async findByPk(id) {
    return rows.find((row) => row.id === id) || null;
  },

  async findAll({ where = {}, order } = {}) {
    return sortRows(
      rows.filter((row) => matchesWhere(row, where)),
      order
    );
  },

  async create(payload) {
    const row = {
      id: payload.id || nextMockUuid(),
      ...payload,
    };

    rows.push(row);
    return row;
  },

  async bulkCreate(payloads, { returning = false } = {}) {
    const created = payloads.map((payload, index) => ({
      id: payload.id || nextMockUuid(),
      ...payload,
    }));

    rows.push(...created);

    return returning ? created : undefined;
  },

  async destroy({ where = {} } = {}) {
    const remainingRows = rows.filter((row) => !matchesWhere(row, where));
    const deletedCount = rows.length - remainingRows.length;

    rows.splice(0, rows.length, ...remainingRows);

    return deletedCount;
  },
});

const createMockDb = (fixtures = {}) => {
  const state = {
    trips: [...(fixtures.trips || [])],
    itineraries: [...(fixtures.itineraries || [])],
    itineraryDays: [...(fixtures.itineraryDays || [])],
    itineraryItems: [...(fixtures.itineraryItems || [])],
    attractions: [...(fixtures.attractions || [])],
    preferenceCategories: [...(fixtures.preferenceCategories || [])],
    tripPreferenceCategories: [...(fixtures.tripPreferenceCategories || [])],
    attractionCategories: [...(fixtures.attractionCategories || [])],
    attractionCategoryMappings: [...(fixtures.attractionCategoryMappings || [])],
  };

  return {
    state,
    sequelize: {
      async transaction(work) {
        return work({ id: "transaction" });
      },
    },
    Trip: createCollectionModel(state.trips),
    Itinerary: createCollectionModel(state.itineraries),
    ItineraryDay: createCollectionModel(state.itineraryDays),
    ItineraryItem: createCollectionModel(state.itineraryItems),
    Attraction: createCollectionModel(state.attractions),
    PreferenceCategory: createCollectionModel(state.preferenceCategories),
    TripPreferenceCategory: createCollectionModel(state.tripPreferenceCategories),
    AttractionCategory: createCollectionModel(state.attractionCategories),
    AttractionCategoryMapping: createCollectionModel(state.attractionCategoryMappings),
  };
};

module.exports = {
  createMockDb,
};
