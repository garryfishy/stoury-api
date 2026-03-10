const { readRecordValue } = require("../../utils/model-helpers");

const serializePreferenceCategory = (record) => ({
  id: readRecordValue(record, ["id"]),
  name: readRecordValue(record, ["name"], ""),
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
  loadPreferenceCategoriesByIds,
  loadUserPreferenceCategories,
  serializePreferenceCategory,
};
