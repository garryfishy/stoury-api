"use strict";

const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const QA_USER = {
  email: "qa@stoury.local",
  full_name: "QA Demo User",
  password: "StouryQA123!",
  preferenceSlugs: ["popular", "food", "history"]
};

const isNonProductionSeedTarget = (databaseName) => {
  const runtimeEnv = process.env.NODE_ENV || "development";

  return (
    runtimeEnv === "development" ||
    runtimeEnv === "test" ||
    /(_dev|_test)$/.test(databaseName || "")
  );
};

module.exports = {
  async up(queryInterface) {
    const [databaseRows] = await queryInterface.sequelize.query(
      "SELECT current_database() AS database_name;"
    );
    const databaseName = databaseRows[0]?.database_name;

    if (!isNonProductionSeedTarget(databaseName)) {
      return;
    }

    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = :email;",
      {
        replacements: { email: QA_USER.email }
      }
    );

    const userId = existingUsers[0]?.id || randomUUID();

    if (!existingUsers.length) {
      const now = new Date();
      const passwordHash = bcrypt.hashSync(QA_USER.password, 12);

      await queryInterface.bulkInsert("users", [
        {
          id: userId,
          email: QA_USER.email,
          full_name: QA_USER.full_name,
          password_hash: passwordHash,
          is_active: true,
          last_login_at: null,
          created_at: now,
          updated_at: now
        }
      ]);
    }

    const [roleRows] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE code = 'user' LIMIT 1;"
    );
    const roleId = roleRows[0]?.id;

    if (roleId) {
      const [existingRole] = await queryInterface.sequelize.query(
        `
          SELECT 1
          FROM user_roles
          WHERE user_id = :userId AND role_id = :roleId
          LIMIT 1;
        `,
        {
          replacements: { userId, roleId }
        }
      );

      if (!existingRole.length) {
        const now = new Date();

        await queryInterface.bulkInsert("user_roles", [
          {
            id: randomUUID(),
            user_id: userId,
            role_id: roleId,
            created_at: now,
            updated_at: now
          }
        ]);
      }
    }

    const [preferenceRows] = await queryInterface.sequelize.query(
      `
        SELECT id, slug
        FROM preference_categories
        WHERE slug IN (:slugs);
      `,
      {
        replacements: { slugs: QA_USER.preferenceSlugs }
      }
    );

    const existingPreferenceSlugs = new Set(
      (
        await queryInterface.sequelize.query(
          `
            SELECT pc.slug
            FROM user_preference_categories upc
            JOIN preference_categories pc
              ON pc.id = upc.preference_category_id
            WHERE upc.user_id = :userId;
          `,
          {
            replacements: { userId }
          }
        )
      )[0].map((row) => row.slug)
    );

    const missingPreferenceRows = preferenceRows.filter(
      (row) => !existingPreferenceSlugs.has(row.slug)
    );

    if (missingPreferenceRows.length) {
      const now = new Date();

      await queryInterface.bulkInsert(
        "user_preference_categories",
        missingPreferenceRows.map((row) => ({
          id: randomUUID(),
          user_id: userId,
          preference_category_id: row.id,
          created_at: now,
          updated_at: now
        }))
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", {
      email: QA_USER.email
    });
  }
};
