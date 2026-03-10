const { AppError } = require("../utils/app-error");

const authorize = (...requiredRoles) => (req, _res, next) => {
  const roles = req.auth?.roles || [];
  const isAuthorized = requiredRoles.some((role) => roles.includes(role));

  if (!isAuthorized) {
    return next(new AppError("You do not have permission to perform this action.", 403));
  }

  next();
};

module.exports = { authorize };
