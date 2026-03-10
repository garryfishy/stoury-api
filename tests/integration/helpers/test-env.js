process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.AUTH_RATE_LIMIT_WINDOW_MS =
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000";
process.env.AUTH_RATE_LIMIT_MAX =
  process.env.AUTH_RATE_LIMIT_MAX || "1000";

