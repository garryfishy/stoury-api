"use strict";

const TRIPS_TABLE = "trips";
const OVERLAP_CONSTRAINT = "trips_no_same_destination_overlap";

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE ${TRIPS_TABLE}
          DROP CONSTRAINT IF EXISTS ${OVERLAP_CONSTRAINT};
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE ${TRIPS_TABLE}
          ADD CONSTRAINT ${OVERLAP_CONSTRAINT}
          EXCLUDE USING gist (
            user_id WITH =,
            destination_id WITH =,
            daterange(start_date, end_date, '[]') WITH &&
          );
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
