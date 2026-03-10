"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE attractions
          ALTER COLUMN rating TYPE DECIMAL(3,2),
          ALTER COLUMN external_rating TYPE DECIMAL(3,2);
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE attractions
          ALTER COLUMN rating TYPE DECIMAL(2,1) USING ROUND(rating::numeric, 1),
          ALTER COLUMN external_rating TYPE DECIMAL(2,1) USING ROUND(external_rating::numeric, 1);
        `,
        { transaction }
      );
    });
  }
};
