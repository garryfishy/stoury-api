"use strict";

const { destinations } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "destinations",
      destinations.map((destination) => ({
        ...destination,
        metadata: JSON.stringify(destination.metadata || {}),
        created_at: now,
        updated_at: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("destinations", {
      slug: destinations.map((destination) => destination.slug)
    });
  }
};
