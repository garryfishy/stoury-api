process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createPreferencesService } = require("../src/modules/preferences/preferences.service");

describe("preferences service", () => {
  test("getMyPreferences returns serialized preference categories", async () => {
    const db = {
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([
          {
            id: "55555555-5555-4555-8555-555555555555",
            name: "Food",
            slug: "food",
            description: "Food hunting",
          },
        ]),
      },
      UserPreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([
          {
            userId: "11111111-1111-4111-8111-111111111111",
            preferenceCategoryId: "55555555-5555-4555-8555-555555555555",
          },
        ]),
      },
    };
    const preferencesService = createPreferencesService({
      dbProvider: () => db,
    });

    const result = await preferencesService.getMyPreferences(
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual([
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "Food",
        slug: "food",
        description: "Food hunting",
      },
    ]);
  });

  test("replaceMyPreferences replaces existing mappings", async () => {
    const categoryIds = [
      "55555555-5555-4555-8555-555555555555",
      "66666666-6666-4666-8666-666666666666",
    ];
    const categories = [
      {
        id: categoryIds[0],
        name: "Food",
        slug: "food",
        description: "Food hunting",
      },
      {
        id: categoryIds[1],
        name: "Culture",
        slug: "culture",
        description: "Culture",
      },
    ];
    const db = {
      PreferenceCategory: {
        findAll: jest
          .fn()
          .mockResolvedValueOnce(categories)
          .mockResolvedValueOnce(categories),
      },
      UserPreferenceCategory: {
        destroy: jest.fn().mockResolvedValue(2),
        bulkCreate: jest.fn().mockResolvedValue([]),
      },
    };
    const preferencesService = createPreferencesService({
      dbProvider: () => db,
    });

    const result = await preferencesService.replaceMyPreferences(
      "11111111-1111-4111-8111-111111111111",
      categoryIds
    );

    expect(db.UserPreferenceCategory.destroy).toHaveBeenCalledWith({
      where: { userId: "11111111-1111-4111-8111-111111111111" },
      transaction: null,
    });
    expect(db.UserPreferenceCategory.bulkCreate).toHaveBeenCalledWith(
      [
        {
          userId: "11111111-1111-4111-8111-111111111111",
          preferenceCategoryId: categoryIds[0],
        },
        {
          userId: "11111111-1111-4111-8111-111111111111",
          preferenceCategoryId: categoryIds[1],
        },
      ],
      { transaction: null }
    );
    expect(result).toHaveLength(2);
  });

  test("replaceMyPreferences rejects unknown categories", async () => {
    const db = {
      PreferenceCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      UserPreferenceCategory: {
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
      },
    };
    const preferencesService = createPreferencesService({
      dbProvider: () => db,
    });

    await expect(
      preferencesService.replaceMyPreferences(
        "11111111-1111-4111-8111-111111111111",
        ["55555555-5555-4555-8555-555555555555"]
      )
    ).rejects.toMatchObject({
      message: "One or more preference categories do not exist.",
      statusCode: 422,
    });
  });
});
