const rateLimit = require("express-rate-limit");
const env = require("../../config/env");
const { buildAdminLoginUrl } = require("./admin-web.helpers");

const adminLoginRateLimit = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    return res.redirect(
      buildAdminLoginUrl({
        nextPath: req.body?.next || req.query?.next,
        reason: "rate_limited",
      })
    );
  },
});

module.exports = {
  adminLoginRateLimit,
};
