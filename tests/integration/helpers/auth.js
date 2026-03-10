require("./test-env");

const { TEST_EMAIL_PREFIX } = require("./db");
const { db } = require("./db");

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

const loginWithCredentials = async (request, app, { email, password }) => {
  const response = await request(app).post("/api/auth/login").send({
    email,
    password,
  });

  return response.body.data;
};

const grantRole = async (userId, roleCode) => {
  const role = await db.Role.findOne({
    where: {
      code: roleCode,
    },
  });

  if (!role) {
    throw new Error(`Role ${roleCode} not found in the test database.`);
  }

  await db.UserRole.findOrCreate({
    where: {
      userId,
      roleId: role.id,
    },
    defaults: {
      userId,
      roleId: role.id,
    },
  });
};

const authHeader = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
});

module.exports = {
  authHeader,
  createTestEmail,
  grantRole,
  loginWithCredentials,
  registerAndLogin,
};
