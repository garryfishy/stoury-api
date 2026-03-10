process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createUsersService } = require("../src/modules/users/users.service");

describe("users service", () => {
  test("getProfile returns the serialized profile with roles", async () => {
    const db = {
      User: {
        findByPk: jest.fn().mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          fullName: "Ayu Pratama",
          email: "ayu@example.com",
        }),
      },
      UserRole: {
        findAll: jest.fn().mockResolvedValue([{ roleId: "role-user-id" }]),
      },
      Role: {
        findAll: jest.fn().mockResolvedValue([{ id: "role-user-id", code: "user" }]),
      },
    };
    const usersService = createUsersService({
      dbProvider: () => db,
    });

    const result = await usersService.getProfile("11111111-1111-4111-8111-111111111111");

    expect(result).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Ayu Pratama",
      email: "ayu@example.com",
      roles: ["user"],
    });
  });

  test("updateProfile updates fullName and returns the serialized user", async () => {
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      fullName: "Ayu",
      email: "ayu@example.com",
      update: jest.fn().mockImplementation(async ({ fullName }) => {
        user.fullName = fullName;
      }),
    };
    const db = {
      User: {
        findByPk: jest.fn().mockResolvedValue(user),
      },
      UserRole: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      Role: {},
    };
    const usersService = createUsersService({
      dbProvider: () => db,
    });

    const result = await usersService.updateProfile(user.id, {
      name: "Ayu Pratama",
    });

    expect(user.update).toHaveBeenCalledWith({ fullName: "Ayu Pratama" });
    expect(result).toEqual({
      id: user.id,
      name: "Ayu Pratama",
      email: "ayu@example.com",
      roles: ["user"],
    });
  });
});
