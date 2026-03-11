"use strict";

const bcrypt = require("bcryptjs");
const db = require("../src/database/models");

const ADMIN_CONFIG = {
  email: process.env.SEED_ADMIN_EMAIL || "admin@stoury.co",
  fullName: process.env.SEED_ADMIN_NAME || "admin",
  password: process.env.SEED_ADMIN_PASSWORD || "admin123",
};

const ROLE_DEFINITIONS = [
  {
    code: "user",
    name: "User",
    description: "Default authenticated traveler role.",
  },
  {
    code: "admin",
    name: "Admin",
    description: "Internal operations and management role.",
  },
];

const ensureRole = async (Role, roleDefinition, transaction) => {
  const [role] = await Role.findOrCreate({
    where: { code: roleDefinition.code },
    defaults: roleDefinition,
    transaction,
  });

  const updates = {};

  if (role.name !== roleDefinition.name) {
    updates.name = roleDefinition.name;
  }

  if (role.description !== roleDefinition.description) {
    updates.description = roleDefinition.description;
  }

  if (Object.keys(updates).length) {
    await role.update(updates, { transaction });
  }

  return role;
};

const run = async () => {
  const { Role, User, UserRole, sequelize } = db;

  if (!Role || !User || !UserRole || !sequelize) {
    throw new Error("Required database models are not available.");
  }

  await sequelize.authenticate();

  const passwordHash = bcrypt.hashSync(ADMIN_CONFIG.password, 12);

  await sequelize.transaction(async (transaction) => {
    const roles = await Promise.all(
      ROLE_DEFINITIONS.map((definition) => ensureRole(Role, definition, transaction))
    );
    const rolesByCode = new Map(roles.map((role) => [role.code, role]));

    const [user] = await User.findOrCreate({
      where: { email: ADMIN_CONFIG.email },
      defaults: {
        email: ADMIN_CONFIG.email,
        fullName: ADMIN_CONFIG.fullName,
        passwordHash,
        isActive: true,
      },
      transaction,
    });

    const userUpdates = {};

    if (user.fullName !== ADMIN_CONFIG.fullName) {
      userUpdates.fullName = ADMIN_CONFIG.fullName;
    }

    if (!user.isActive) {
      userUpdates.isActive = true;
    }

    if (user.passwordHash !== passwordHash) {
      userUpdates.passwordHash = passwordHash;
    }

    if (Object.keys(userUpdates).length) {
      await user.update(userUpdates, { transaction });
    }

    for (const roleCode of ["user", "admin"]) {
      const role = rolesByCode.get(roleCode);

      if (!role) {
        throw new Error(`Role "${roleCode}" could not be resolved.`);
      }

      await UserRole.findOrCreate({
        where: {
          userId: user.id,
          roleId: role.id,
        },
        defaults: {
          userId: user.id,
          roleId: role.id,
        },
        transaction,
      });
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          email: user.email,
          fullName: user.fullName,
          roles: ["user", "admin"],
        },
        null,
        2
      )
    );
  });
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.sequelize.close().catch(() => {});
  });
