"use strict";

const { preferenceCategories } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "preference_categories",
      preferenceCategories.map((category) => ({
        ...category,
        created_at: now,
        updated_at: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("preference_categories", {
      slug: preferenceCategories.map((category) => category.slug)
    });
  }
};
