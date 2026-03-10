"use strict";

const ENRICHMENT_STATUSES = ["pending", "enriched", "needs_review", "failed"];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "attractions",
        "enrichment_status",
        {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "attractions",
        "enrichment_error",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "attractions",
        "enrichment_attempted_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          UPDATE attractions
          SET enrichment_status = CASE
            WHEN external_place_id IS NOT NULL THEN 'enriched'
            ELSE 'pending'
          END
          WHERE enrichment_status IS NULL;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE attractions
          ALTER COLUMN enrichment_status SET DEFAULT 'pending',
          ALTER COLUMN enrichment_status SET NOT NULL,
          ADD CONSTRAINT attractions_enrichment_status_check
          CHECK (
            enrichment_status IN (${ENRICHMENT_STATUSES.map((status) => `'${status}'`).join(", ")})
          );
        `,
        { transaction }
      );

      await queryInterface.addIndex("attractions", ["enrichment_status"], {
        name: "attractions_enrichment_status_idx",
        transaction,
      });

      await queryInterface.addIndex("attractions", ["external_last_synced_at"], {
        name: "attractions_external_last_synced_at_idx",
        transaction,
      });

      await queryInterface.addIndex(
        "attractions",
        ["enrichment_status", "destination_id", "external_last_synced_at"],
        {
          name: "attractions_enrichment_status_destination_sync_idx",
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("attractions", "attractions_enrichment_status_idx", {
        transaction,
      });

      await queryInterface.removeIndex(
        "attractions",
        "attractions_external_last_synced_at_idx",
        { transaction }
      );

      await queryInterface.removeIndex(
        "attractions",
        "attractions_enrichment_status_destination_sync_idx",
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE attractions
          DROP CONSTRAINT IF EXISTS attractions_enrichment_status_check;
        `,
        { transaction }
      );

      await queryInterface.removeColumn("attractions", "enrichment_attempted_at", {
        transaction,
      });

      await queryInterface.removeColumn("attractions", "enrichment_error", {
        transaction,
      });

      await queryInterface.removeColumn("attractions", "enrichment_status", {
        transaction,
      });
    });
  },
};
