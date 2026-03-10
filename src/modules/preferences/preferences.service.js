const { getDb, getRequiredModel, withTransaction } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const {
  loadPreferenceCategoriesByIds,
  loadUserPreferenceCategories,
  serializePreferenceCategory,
} = require("./preferences.helpers");

const createPreferencesService = ({ dbProvider = getDb } = {}) => ({
  async getMyPreferences(userId) {
    const db = dbProvider();
    getRequiredModel(db, "PreferenceCategory");
    getRequiredModel(db, "UserPreferenceCategory");
    const categories = await loadUserPreferenceCategories(db, userId);
    return categories.map(serializePreferenceCategory);
  },

  async replaceMyPreferences(userId, categoryIds) {
    const db = dbProvider();
    const PreferenceCategory = getRequiredModel(db, "PreferenceCategory");
    const UserPreferenceCategory = getRequiredModel(db, "UserPreferenceCategory");

    return withTransaction(async (transaction) => {
      const categories = await loadPreferenceCategoriesByIds(db, categoryIds, transaction);

      if (categories.length !== categoryIds.length) {
        throw new AppError("One or more preference categories do not exist.", 422);
      }

      await UserPreferenceCategory.destroy({
        where: { userId },
        transaction,
      });

      if (categoryIds.length) {
        await UserPreferenceCategory.bulkCreate(
          categoryIds.map((categoryId) => ({ userId, preferenceCategoryId: categoryId })),
          { transaction }
        );
      }

      const refreshedCategories = await PreferenceCategory.findAll({
        where: { id: categoryIds, isActive: true },
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
        transaction,
      });

      return refreshedCategories.map(serializePreferenceCategory);
    }, db);
  },
});

const preferencesService = createPreferencesService();

module.exports = {
  createPreferencesService,
  preferencesService,
};
