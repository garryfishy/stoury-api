const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { getDb, getRequiredModel, withTransaction } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const { readRecordValue } = require("../../utils/model-helpers");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../../utils/jwt");
const {
  attachDefaultUserRole,
  getUserId,
  getUserRoles,
  serializeUser,
} = require("../users/users.helpers");

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createAuthService = ({ dbProvider = getDb } = {}) => {
  const buildAuthResponse = async (db, user, transaction) => {
    const userId = getUserId(user);
    const roles = await getUserRoles(db, userId, transaction);
    const accessToken = signAccessToken({
      userId,
      email: readRecordValue(user, ["email"], ""),
      roles,
    });
    const refreshToken = signRefreshToken({
      userId,
      email: readRecordValue(user, ["email"], ""),
      roles,
    });
    const decodedRefreshToken = jwt.decode(refreshToken);

    const RefreshToken = getRequiredModel(db, "RefreshToken");

    await RefreshToken.create(
      {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: decodedRefreshToken?.exp
          ? new Date(decodedRefreshToken.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { transaction }
    );

    return {
      accessToken,
      refreshToken,
      user: serializeUser(user, roles),
    };
  };

  const getUserByEmail = async (User, email, transaction) =>
    User.findOne({
      where: { email },
      transaction,
    });

  const findStoredRefreshToken = async (RefreshToken, hashedToken, transaction) =>
    RefreshToken.findOne({
      where: {
        tokenHash: hashedToken,
      },
      transaction,
    });

  return {
    async register(payload) {
      const db = dbProvider();
      const User = getRequiredModel(db, "User");

      return withTransaction(async (transaction) => {
        const existingUser = await getUserByEmail(User, payload.email, transaction);

        if (existingUser) {
          throw new AppError("Email is already registered.", 409);
        }

        const passwordHash = await bcrypt.hash(payload.password, 12);

        const user = await User.create(
          {
            fullName: payload.name,
            email: payload.email,
            passwordHash,
          },
          { transaction }
        );

        await attachDefaultUserRole(db, getUserId(user), transaction);

        return buildAuthResponse(db, user, transaction);
      }, db);
    },

    async login(payload) {
      const db = dbProvider();
      const User = getRequiredModel(db, "User");
      const user = await getUserByEmail(User, payload.email);

      if (!user) {
        throw new AppError("Invalid email or password.", 401);
      }

      if (!user.isActive) {
        throw new AppError("This account is inactive.", 403);
      }

      const passwordHash = readRecordValue(user, ["passwordHash"], "");
      const isValidPassword = await bcrypt.compare(payload.password, passwordHash);

      if (!isValidPassword) {
        throw new AppError("Invalid email or password.", 401);
      }

      return withTransaction(async (transaction) => {
        await user.update({ lastLoginAt: new Date() }, { transaction });
        return buildAuthResponse(db, user, transaction);
      }, db);
    },

    async refresh(refreshToken) {
      const db = dbProvider();
      const User = getRequiredModel(db, "User");
      const RefreshToken = getRequiredModel(db, "RefreshToken");

      let payload;

      try {
        payload = verifyRefreshToken(refreshToken);
      } catch (_error) {
        throw new AppError("Invalid or expired refresh token.", 401);
      }

      if (payload.tokenType !== "refresh") {
        throw new AppError("Invalid refresh token.", 401);
      }

      const hashedToken = hashRefreshToken(refreshToken);
      const storedToken = await findStoredRefreshToken(RefreshToken, hashedToken);

      if (!storedToken) {
        throw new AppError("Refresh token is not recognized.", 401);
      }

      if (readRecordValue(storedToken, ["revokedAt"])) {
        throw new AppError("Refresh token has been revoked.", 401);
      }

      const expiresAt = readRecordValue(storedToken, ["expiresAt"]);

      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        throw new AppError("Refresh token has expired.", 401);
      }

      const user = await User.findByPk(String(payload.sub));

      if (!user) {
        throw new AppError("User not found.", 404);
      }

      return withTransaction(async (transaction) => {
        await storedToken.update({ revokedAt: new Date(), lastUsedAt: new Date() }, { transaction });

        return buildAuthResponse(db, user, transaction);
      }, db);
    },

    async logout(refreshToken) {
      const db = dbProvider();
      const RefreshToken = getRequiredModel(db, "RefreshToken");
      const hashedToken = hashRefreshToken(refreshToken);
      const storedToken = await findStoredRefreshToken(RefreshToken, hashedToken);

      if (!storedToken) {
        return;
      }

      await storedToken.update({ revokedAt: new Date() });
    },
  };
};

const authService = createAuthService();

module.exports = {
  authService,
  createAuthService,
};
