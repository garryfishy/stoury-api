const { AppError } = require("../utils/app-error");

const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
};

module.exports = { notFoundHandler };
