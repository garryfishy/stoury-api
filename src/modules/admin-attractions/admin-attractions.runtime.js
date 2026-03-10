const env = require("../../config/env");
const { logger } = require("../../config/logger");

const getAdminEnrichmentRuntimeStatus = ({ envConfig = env } = {}) => {
  const featureFlagEnabled = Boolean(envConfig.ADMIN_ENRICHMENT_ENABLED);
  const googlePlacesConfigured = Boolean(envConfig.GOOGLE_PLACES_API_KEY);

  if (!featureFlagEnabled) {
    return {
      enabled: false,
      status: "disabled",
      featureFlagEnabled,
      googlePlacesConfigured,
      message: "Admin attraction enrichment is disabled in this environment.",
    };
  }

  if (!googlePlacesConfigured) {
    return {
      enabled: false,
      status: "misconfigured",
      featureFlagEnabled,
      googlePlacesConfigured,
      message:
        "Admin attraction enrichment is enabled but GOOGLE_PLACES_API_KEY is not configured.",
    };
  }

  return {
    enabled: true,
    status: "enabled",
    featureFlagEnabled,
    googlePlacesConfigured,
    message: "Admin attraction enrichment is enabled.",
  };
};

const logAdminEnrichmentStartupStatus = ({
  envConfig = env,
  loggerInstance = logger,
} = {}) => {
  const status = getAdminEnrichmentRuntimeStatus({ envConfig });

  if (status.status === "enabled") {
    loggerInstance.info(status.message, {
      feature: "admin_enrichment",
      status: status.status,
    });
    return status;
  }

  loggerInstance.warn(status.message, {
    feature: "admin_enrichment",
    status: status.status,
    featureFlagEnabled: status.featureFlagEnabled,
    googlePlacesConfigured: status.googlePlacesConfigured,
  });

  return status;
};

module.exports = {
  getAdminEnrichmentRuntimeStatus,
  logAdminEnrichmentStartupStatus,
};
