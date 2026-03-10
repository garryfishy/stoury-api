const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserPreferenceCategory extends Model {}

  UserPreferenceCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      preferenceCategoryId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "UserPreferenceCategory",
      tableName: "user_preference_categories",
      underscored: true
    }
  );

  return UserPreferenceCategory;
};
