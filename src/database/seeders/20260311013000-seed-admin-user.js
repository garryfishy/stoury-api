"use strict";

const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const ADMIN_USER = {
  email: process.env.SEED_ADMIN_EMAIL || "admin@stoury.co",
  full_name: process.env.SEED_ADMIN_NAME || "Stoury Admin",
  password: process.env.SEED_ADMIN_PASSWORD || "admin",
  roleCodes: ["user", "admin"],
};

const isTruthy = (value) => ["1", "true", "yes", "on"].includes(String(value).toLowerCase());

const isSeedTargetAllowed = (databaseName) => {
  const runtimeEnv = process.env.NODE_ENV || "development";

  return (
    runtimeEnv === "development" ||
    runtimeEnv === "test" ||
    /(_dev|_test)$/.test(databaseName || "") ||
    isTruthy(process.env.SEED_DEFAULT_ADMIN_USER)
  );
};

module.exports = {
  async up(queryInterface) {
    const [databaseRows] = await queryInterface.sequelize.query(
      "SELECT current_database() AS database_name;"
    );
    const databaseName = databaseRows[0]?.database_name;

    if (!isSeedTargetAllowed(databaseName)) {
      return;
    }

    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = :email;",
      {
        replacements: { email: ADMIN_USER.email },
      }
    );

    const userId = existingUsers[0]?.id || randomUUID();

    if (!existingUsers.length) {
      const now = new Date();
      const passwordHash = bcrypt.hashSync(ADMIN_USER.password, 12);

      await queryInterface.bulkInsert("users", [
        {
          id: userId,
          email: ADMIN_USER.email,
          full_name: ADMIN_USER.full_name,
          password_hash: passwordHash,
          is_active: true,
          last_login_at: null,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const [roleRows] = await queryInterface.sequelize.query(
      `
        SELECT id, code
        FROM roles
        WHERE code IN (:roleCodes);
      `,
      {
        replacements: { roleCodes: ADMIN_USER.roleCodes },
      }
    );

    const roleByCode = new Map(roleRows.map((row) => [row.code, row.id]));
    const [existingRoleRows] = await queryInterface.sequelize.query(
      `
        SELECT r.code
        FROM user_roles ur
        JOIN roles r
          ON r.id = ur.role_id
        WHERE ur.user_id = :userId;
      `,
      {
        replacements: { userId },
      }
    );

    const existingRoleCodes = new Set(existingRoleRows.map((row) => row.code));
    const missingRoleCodes = ADMIN_USER.roleCodes.filter(
      (roleCode) => roleByCode.has(roleCode) && !existingRoleCodes.has(roleCode)
    );

    if (missingRoleCodes.length) {
      const now = new Date();

      await queryInterface.bulkInsert(
        "user_roles",
        missingRoleCodes.map((roleCode) => ({
          id: randomUUID(),
          user_id: userId,
          role_id: roleByCode.get(roleCode),
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },

  async down(queryInterface) {
    const [userRows] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = :email;",
      {
        replacements: { email: ADMIN_USER.email },
      }
    );
    const userId = userRows[0]?.id;

    if (!userId) {
      return;
    }

    await queryInterface.bulkDelete("refresh_tokens", { user_id: userId });
    await queryInterface.bulkDelete("user_roles", { user_id: userId });
    await queryInterface.bulkDelete("users", { id: userId });
  },
};
