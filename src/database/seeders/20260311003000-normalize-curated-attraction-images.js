"use strict";

const { attractions } = require("./data/catalog");

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate(
      "attractions",
      {
        thumbnail_image_url: null,
        main_image_url: null,
        updated_at: new Date(),
      },
      {
        slug: attractions.map((attraction) => attraction.slug),
      }
    );
  },

  async down() {},
};
