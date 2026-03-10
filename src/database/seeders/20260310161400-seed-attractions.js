"use strict";

const { attractions } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    const [destinations] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM destinations;"
    );
    const destinationBySlug = new Map(destinations.map((row) => [row.slug, row.id]));
    const now = new Date();

    await queryInterface.bulkInsert(
      "attractions",
      attractions.map(({ destinationSlug, categories, ...attraction }) => ({
        ...attraction,
        opening_hours: JSON.stringify(attraction.opening_hours || {}),
        metadata: JSON.stringify(attraction.metadata || {}),
        destination_id: destinationBySlug.get(destinationSlug),
        created_at: now,
        updated_at: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("attractions", {
      slug: attractions.map((attraction) => attraction.slug)
    });
  }
};
