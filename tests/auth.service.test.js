process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const bcrypt = require("bcryptjs");
const { createAuthService } = require("../src/modules/auth/auth.service");
const { registerSchema } = require("../src/modules/auth/auth.validators");
const { signRefreshToken } = require("../src/utils/jwt");

describe("auth service", () => {
  test("register creates a user, assigns default role, and stores refresh token", async () => {
    const createdUser = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "ayu@example.com",
      fullName: "Ayu Pratama",
    };
    const db = {
      User: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdUser),
      },
      Role: {
        findOne: jest.fn().mockResolvedValue({ id: "role-user-id", code: "user" }),
        findAll: jest.fn().mockResolvedValue([{ id: "role-user-id", code: "user" }]),
      },
      UserRole: {
        findAll: jest.fn().mockResolvedValue([{ roleId: "role-user-id" }]),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      RefreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh-token-id" }),
      },
    };
    const authService = createAuthService({
      dbProvider: () => db,
    });

    const result = await authService.register({
      name: "Ayu Pratama",
      email: "ayu@example.com",
      password: "securePass123",
    });

    expect(db.User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Ayu Pratama",
        email: "ayu@example.com",
        passwordHash: expect.any(String),
      }),
      { transaction: null }
    );
    expect(result.user).toEqual({
      id: createdUser.id,
      name: "Ayu Pratama",
      email: "ayu@example.com",
      roles: ["user"],
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(db.RefreshToken.create).toHaveBeenCalled();
  });

  test("login rejects invalid passwords", async () => {
    const db = {
      User: {
        findOne: jest.fn().mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          email: "ayu@example.com",
          fullName: "Ayu Pratama",
          isActive: true,
          passwordHash: await bcrypt.hash("correct-password", 4),
        }),
      },
    };
    const authService = createAuthService({
      dbProvider: () => db,
    });

    await expect(
      authService.login({
        email: "ayu@example.com",
        password: "wrong-password",
      })
    ).rejects.toMatchObject({
      message: "Invalid email or password.",
      statusCode: 401,
    });
  });

  test("register rejects duplicate email addresses", async () => {
    const db = {
      User: {
        findOne: jest.fn().mockResolvedValue({
          id: "existing-user-id",
          email: "ayu@example.com",
        }),
      },
    };
    const authService = createAuthService({
      dbProvider: () => db,
    });

    await expect(
      authService.register({
        name: "Ayu Pratama",
        email: "ayu@example.com",
        password: "securePass123",
      })
    ).rejects.toMatchObject({
      message: "Email is already registered.",
      statusCode: 409,
    });
  });

  test("refresh rejects revoked refresh tokens", async () => {
    const refreshToken = signRefreshToken({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "ayu@example.com",
      roles: ["user"],
    });
    const db = {
      User: {
        findByPk: jest.fn(),
      },
      RefreshToken: {
        findOne: jest.fn().mockResolvedValue({
          revokedAt: new Date().toISOString(),
        }),
      },
    };
    const authService = createAuthService({
      dbProvider: () => db,
    });

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({
      message: "Refresh token has been revoked.",
      statusCode: 401,
    });
  });

  test("refresh rejects expired stored refresh tokens", async () => {
    const refreshToken = signRefreshToken({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "ayu@example.com",
      roles: ["user"],
    });
    const db = {
      User: {
        findByPk: jest.fn(),
      },
      RefreshToken: {
        findOne: jest.fn().mockResolvedValue({
          revokedAt: null,
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      },
    };
    const authService = createAuthService({
      dbProvider: () => db,
    });

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({
      message: "Refresh token has expired.",
      statusCode: 401,
    });
  });

  test("logout ignores unknown refresh tokens", async () => {
    const db = {
      RefreshToken: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    };
    const authService = createAuthService({
      dbProvider: () => db,
    });

    await expect(authService.logout("not-a-known-token")).resolves.toBeUndefined();
    expect(db.RefreshToken.findOne).toHaveBeenCalled();
  });

  test("register validation rejects weak passwords", () => {
    const result = registerSchema.safeParse({
      name: "Ayu Pratama",
      email: "ayu@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["password"],
        }),
      ])
    );
  });
});
