const { verifyAccessToken } = require("../utils/jwt");
const { AppError } = require("../utils/app-error");

const authenticate = (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(new AppError("Authentication required.", 401));
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);

    if (payload.tokenType !== "access") {
      throw new Error("Invalid token type.");
    }

    req.auth = {
      userId: String(payload.sub),
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : ["user"],
    };
    next();
  } catch (_error) {
    next(new AppError("Invalid or expired access token.", 401));
  }
};

module.exports = { authenticate };
