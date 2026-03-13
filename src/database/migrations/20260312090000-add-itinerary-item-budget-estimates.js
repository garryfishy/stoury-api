"use strict";

const TABLE_NAME = "itinerary_items";
const MIN_NON_NEGATIVE_CONSTRAINT =
  "itinerary_items_estimated_budget_min_non_negative_check";
const MAX_NON_NEGATIVE_CONSTRAINT =
  "itinerary_items_estimated_budget_max_non_negative_check";
const RANGE_CONSTRAINT = "itinerary_items_estimated_budget_range_check";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        TABLE_NAME,
        "estimated_budget_min",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        TABLE_NAME,
        "estimated_budget_max",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        TABLE_NAME,
        "estimated_budget_note",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE ${TABLE_NAME}
          ADD CONSTRAINT ${MIN_NON_NEGATIVE_CONSTRAINT}
          CHECK (estimated_budget_min IS NULL OR estimated_budget_min >= 0),
          ADD CONSTRAINT ${MAX_NON_NEGATIVE_CONSTRAINT}
          CHECK (estimated_budget_max IS NULL OR estimated_budget_max >= 0),
          ADD CONSTRAINT ${RANGE_CONSTRAINT}
          CHECK (
            estimated_budget_min IS NULL
            OR estimated_budget_max IS NULL
            OR estimated_budget_max >= estimated_budget_min
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

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE ${TABLE_NAME}
          DROP CONSTRAINT IF EXISTS ${RANGE_CONSTRAINT},
          DROP CONSTRAINT IF EXISTS ${MAX_NON_NEGATIVE_CONSTRAINT},
          DROP CONSTRAINT IF EXISTS ${MIN_NON_NEGATIVE_CONSTRAINT};
        `,
        { transaction }
      );

      await queryInterface.removeColumn(TABLE_NAME, "estimated_budget_note", {
        transaction,
      });
      await queryInterface.removeColumn(TABLE_NAME, "estimated_budget_max", {
        transaction,
      });
      await queryInterface.removeColumn(TABLE_NAME, "estimated_budget_min", {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
