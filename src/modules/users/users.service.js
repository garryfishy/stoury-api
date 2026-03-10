const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { getUserRoles, serializeUser } = require("./users.helpers");

const createUsersService = ({ dbProvider = getDb } = {}) => {
  const getUserRecord = async (userId) => {
    const db = dbProvider();
    const User = getRequiredModel(db, "User");

    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return { db, user };
  };

  return {
    async getProfile(userId) {
      const { db, user } = await getUserRecord(userId);
      const roles = await getUserRoles(db, userId);
      return serializeUser(user, roles);
    },

    async updateProfile(userId, payload) {
      const { db, user } = await getUserRecord(userId);

      await user.update({ fullName: payload.name });

      const roles = await getUserRoles(db, userId);
      return serializeUser(user, roles);
    },
  };
};

const usersService = createUsersService();

module.exports = {
  createUsersService,
  usersService,
};
