const { AppError } = require("../utils/app-error");
const adminEnrichmentRuntime = require("../modules/admin-attractions/admin-attractions.runtime");

const ensureAdminEnrichmentAvailable = (req, _res, next) => {
  const status = adminEnrichmentRuntime.getAdminEnrichmentRuntimeStatus();

  if (!status.enabled) {
    return next(new AppError(status.message, 503));
  }

  return next();
};

module.exports = {
  ensureAdminEnrichmentAvailable,
};
