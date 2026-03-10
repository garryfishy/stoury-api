process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.AI_PLANNING_PROVIDER = "deterministic";
process.env.ADMIN_ENRICHMENT_ENABLED = "true";
process.env.ADMIN_ENRICHMENT_RATE_LIMIT_WINDOW_MS =
  process.env.ADMIN_ENRICHMENT_RATE_LIMIT_WINDOW_MS || "60000";
process.env.ADMIN_ENRICHMENT_RATE_LIMIT_MAX =
  process.env.ADMIN_ENRICHMENT_RATE_LIMIT_MAX || "3";
process.env.ADMIN_ENRICHMENT_BATCH_RATE_LIMIT_MAX =
  process.env.ADMIN_ENRICHMENT_BATCH_RATE_LIMIT_MAX || "1";
process.env.GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || "test-google-places-key";
process.env.AUTH_RATE_LIMIT_WINDOW_MS =
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000";
process.env.AUTH_RATE_LIMIT_MAX =
  process.env.AUTH_RATE_LIMIT_MAX || "1000";
