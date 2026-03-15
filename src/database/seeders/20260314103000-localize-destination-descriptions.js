"use strict";

const { destinations } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const destination of destinations) {
      await queryInterface.bulkUpdate(
        "destinations",
        {
          description: destination.description,
          updated_at: now,
        },
        {
          slug: destination.slug,
        }
      );
    }
  },

  async down() {},
};
