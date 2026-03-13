const { readRecordValue } = require("../../utils/model-helpers");

const PREFERENCE_DISPLAY_NAMES = Object.freeze({
  popular: "Populer",
  food: "Makanan",
  shopping: "Belanja",
  history: "Sejarah",
});

const getPreferenceDisplayName = (slug, fallback = "") =>
  PREFERENCE_DISPLAY_NAMES[String(slug || "").trim()] || fallback;

const serializePreferenceCategory = (record) => ({
  id: readRecordValue(record, ["id"]),
  name: getPreferenceDisplayName(
    readRecordValue(record, ["slug"], ""),
    readRecordValue(record, ["name"], "")
  ),
  slug: readRecordValue(record, ["slug"], ""),
  description: readRecordValue(record, ["description"], ""),
});

const loadPreferenceCategoriesByIds = async (db, categoryIds, transaction) => {
  if (!categoryIds.length) {
    return [];
  }

  const PreferenceCategory = db.PreferenceCategory;

  return PreferenceCategory.findAll({
    where: { id: categoryIds, isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    transaction,
  });
};

const loadActivePreferenceCategories = async (db, transaction) => {
  const PreferenceCategory = db.PreferenceCategory;

  return PreferenceCategory.findAll({
    where: { isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    transaction,
  });
};

const loadUserPreferenceCategories = async (db, userId, transaction) => {
  const PreferenceCategory = db.PreferenceCategory;
  const UserPreferenceCategory = db.UserPreferenceCategory;

  const mappings = await UserPreferenceCategory.findAll({
    where: { userId },
    transaction,
  });

  const categoryIds = mappings
    .map((mapping) => readRecordValue(mapping, ["preferenceCategoryId"]))
    .filter(Boolean);

  if (!categoryIds.length) {
    return [];
  }

  return PreferenceCategory.findAll({
    where: { id: categoryIds, isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    transaction,
  });
};

module.exports = {
  PREFERENCE_DISPLAY_NAMES,
  getPreferenceDisplayName,
  loadActivePreferenceCategories,
  loadPreferenceCategoriesByIds,
  loadUserPreferenceCategories,
  serializePreferenceCategory,
};
