"use strict";

const LOCALIZED_PREFERENCE_NAMES = {
  popular: "Populer",
  food: "Makanan",
  shopping: "Belanja",
  history: "Sejarah",
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const [slug, name] of Object.entries(LOCALIZED_PREFERENCE_NAMES)) {
        await queryInterface.bulkUpdate(
          "preference_categories",
          {
            name,
            updated_at: new Date(),
          },
          { slug },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    const rollbackNames = {
      popular: "Popular",
      food: "Makanan",
      shopping: "Belanja",
      history: "History",
    };

    try {
      for (const [slug, name] of Object.entries(rollbackNames)) {
        await queryInterface.bulkUpdate(
          "preference_categories",
          {
            name,
            updated_at: new Date(),
          },
          { slug },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
