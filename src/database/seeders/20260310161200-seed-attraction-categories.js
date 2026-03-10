"use strict";

const { attractionCategories } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "attraction_categories",
      attractionCategories.map((category) => ({
        ...category,
        created_at: now,
        updated_at: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("attraction_categories", {
      slug: attractionCategories.map((category) => category.slug)
    });
  }
};
