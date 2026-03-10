require("./test-env");

const { db } = require("./db");

const mapBySlug = (records) =>
  Object.fromEntries(records.map((record) => [record.slug, record]));

const loadSeedData = async () => {
  const [destinations, preferenceCategories, attractionCategories, attractions] =
    await Promise.all([
      db.Destination.findAll({
        where: { isActive: true },
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
      }),
      db.PreferenceCategory.findAll({
        where: { isActive: true },
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
      }),
      db.AttractionCategory.findAll({
        where: { isActive: true },
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
      }),
      db.Attraction.findAll({
        where: { isActive: true },
        order: [["name", "ASC"]],
      }),
    ]);

  return {
    destinations: mapBySlug(destinations),
    preferenceCategories: mapBySlug(preferenceCategories),
    attractionCategories: mapBySlug(attractionCategories),
    attractions: mapBySlug(attractions),
  };
};

module.exports = {
  loadSeedData,
};
