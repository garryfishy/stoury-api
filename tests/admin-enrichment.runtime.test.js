process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const adminEnrichmentRuntime = require("../src/modules/admin-attractions/admin-attractions.runtime");
const {
  ensureAdminEnrichmentAvailable,
} = require("../src/middlewares/admin-enrichment-availability");

describe("admin enrichment runtime", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("reports disabled status when the feature flag is off", () => {
    const status = adminEnrichmentRuntime.getAdminEnrichmentRuntimeStatus({
      envConfig: {
        ADMIN_ENRICHMENT_ENABLED: false,
        GOOGLE_PLACES_API_KEY: "configured",
      },
    });

    expect(status).toEqual({
      enabled: false,
      status: "disabled",
      featureFlagEnabled: false,
      googlePlacesConfigured: true,
      message: "Admin attraction enrichment is disabled in this environment.",
    });
  });

  test("reports misconfigured status when the feature is on without a Google API key", () => {
    const status = adminEnrichmentRuntime.getAdminEnrichmentRuntimeStatus({
      envConfig: {
        ADMIN_ENRICHMENT_ENABLED: true,
        GOOGLE_PLACES_API_KEY: "",
      },
    });

    expect(status).toEqual({
      enabled: false,
      status: "misconfigured",
      featureFlagEnabled: true,
      googlePlacesConfigured: false,
      message:
        "Admin attraction enrichment is enabled but GOOGLE_PLACES_API_KEY is not configured.",
    });
  });

  test("logs a startup warning when admin enrichment is disabled", () => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    };

    adminEnrichmentRuntime.logAdminEnrichmentStartupStatus({
      envConfig: {
        ADMIN_ENRICHMENT_ENABLED: false,
        GOOGLE_PLACES_API_KEY: "configured",
      },
      loggerInstance: logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "Admin attraction enrichment is disabled in this environment.",
      expect.objectContaining({
        feature: "admin_enrichment",
        status: "disabled",
      })
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  test("logs a startup warning when admin enrichment is enabled without a Google API key", () => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    };

    adminEnrichmentRuntime.logAdminEnrichmentStartupStatus({
      envConfig: {
        ADMIN_ENRICHMENT_ENABLED: true,
        GOOGLE_PLACES_API_KEY: "",
      },
      loggerInstance: logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "Admin attraction enrichment is enabled but GOOGLE_PLACES_API_KEY is not configured.",
      expect.objectContaining({
        feature: "admin_enrichment",
        status: "misconfigured",
      })
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  test("availability middleware returns 503 when admin enrichment is not available", () => {
    const next = jest.fn();

    jest
      .spyOn(adminEnrichmentRuntime, "getAdminEnrichmentRuntimeStatus")
      .mockReturnValue({
        enabled: false,
        status: "misconfigured",
        message:
          "Admin attraction enrichment is enabled but GOOGLE_PLACES_API_KEY is not configured.",
      });

    ensureAdminEnrichmentAvailable({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        message:
          "Admin attraction enrichment is enabled but GOOGLE_PLACES_API_KEY is not configured.",
      })
    );
  });
});
