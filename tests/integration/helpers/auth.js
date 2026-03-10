require("./test-env");

const { TEST_EMAIL_PREFIX } = require("./db");

const createTestEmail = (label = "user") =>
  `${TEST_EMAIL_PREFIX}${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.com`;

const registerAndLogin = async (request, app, overrides = {}) => {
  const email = overrides.email || createTestEmail(overrides.label);
  const password = overrides.password || "TestPass123!";
  const name = overrides.name || "Test User";

  const registerResponse = await request(app).post("/api/auth/register").send({
    name,
    email,
    password,
  });

  return {
    email,
    password,
    registerResponse,
    ...registerResponse.body.data,
  };
};

const authHeader = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
});

module.exports = {
  authHeader,
  createTestEmail,
  registerAndLogin,
};

