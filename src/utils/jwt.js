const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

const signAccessToken = ({ userId, email, roles }) =>
  jwt.sign(
    {
      sub: String(userId),
      email,
      roles,
      tokenType: "access",
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      jwtid: crypto.randomUUID(),
    }
  );

const signRefreshToken = ({ userId, email, roles }) =>
  jwt.sign(
    {
      sub: String(userId),
      email,
      roles,
      tokenType: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      jwtid: crypto.randomUUID(),
    }
  );

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
