"use strict";

const { attractions } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    const [attractionRows] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM attractions;"
    );
    const [categoryRows] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM attraction_categories;"
    );

    const attractionBySlug = new Map(attractionRows.map((row) => [row.slug, row.id]));
    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));
    const now = new Date();

    const mappings = attractions.flatMap((attraction) =>
      attraction.categories.map((categorySlug) => ({
        attraction_id: attractionBySlug.get(attraction.slug),
        attraction_category_id: categoryBySlug.get(categorySlug),
        created_at: now,
        updated_at: now
      }))
    );

    await queryInterface.bulkInsert("attraction_category_mappings", mappings);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("attraction_category_mappings", null, {});
  }
};
