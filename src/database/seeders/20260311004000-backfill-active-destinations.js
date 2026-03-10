"use strict";

const destinationDefaults = [
  { slug: "batam", is_active: true },
  { slug: "yogyakarta", is_active: false },
  { slug: "bali", is_active: false },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const destination of destinationDefaults) {
      await queryInterface.bulkUpdate(
        "destinations",
        {
          is_active: destination.is_active,
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
