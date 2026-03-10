const env = require("../config/env");
const { logger } = require("../config/logger");

const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error.";

  if (statusCode >= 500) {
    logger.error(message, { error });
  }

  const payload = {
    success: false,
    message,
    data: null,
  };

  if (error.details) {
    payload.errors = error.details;
  }

  if (env.NODE_ENV !== "production" && error.stack) {
    payload.meta = { stack: error.stack };
  }

  res.status(statusCode).json(payload);
};

module.exports = { errorHandler };
