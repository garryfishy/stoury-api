"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("roles", [
      {
        code: "user",
        name: "User",
        description: "Default authenticated traveler role.",
        created_at: now,
        updated_at: now
      },
      {
        code: "admin",
        name: "Admin",
        description: "Reserved role for operational and catalog administration.",
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("roles", {
      code: ["user", "admin"]
    });
  }
};
