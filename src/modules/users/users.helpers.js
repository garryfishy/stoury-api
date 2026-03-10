const { readRecordValue } = require("../../utils/model-helpers");

const getUserId = (user) => readRecordValue(user, ["id"]);

const serializeUser = (user, roles = ["user"]) => ({
  id: getUserId(user),
  name: readRecordValue(user, ["name", "fullName", "full_name"], ""),
  email: readRecordValue(user, ["email"], ""),
  roles,
});

const getUserRoles = async (db, userId, transaction) => {
  if (!db.UserRole || !db.Role) {
    return ["user"];
  }

  const userRoles = await db.UserRole.findAll({
    where: { userId },
    transaction,
  });

  if (!userRoles.length) {
    return ["user"];
  }

  const roleIds = userRoles
    .map((record) => readRecordValue(record, ["roleId", "role_id"]))
    .filter(Boolean);

  if (!roleIds.length) {
    return ["user"];
  }

  const roles = await db.Role.findAll({
    where: { id: roleIds },
    transaction,
  });

  return roles.map((role) => readRecordValue(role, ["code"], "user"));
};

const attachDefaultUserRole = async (db, userId, transaction) => {
  if (!db.Role || !db.UserRole) {
    return;
  }

  const userRole = await db.Role.findOne({
    where: { code: "user" },
    transaction,
  });

  if (!userRole) {
    return;
  }

  const roleId = readRecordValue(userRole, ["id"]);

  const existing = await db.UserRole.findOne({
    where: { userId, roleId },
    transaction,
  });

  if (existing) {
    return;
  }

  await db.UserRole.create(
    { userId, roleId },
    { transaction }
  );
};

module.exports = {
  attachDefaultUserRole,
  getUserId,
  getUserRoles,
  serializeUser,
};
