const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PreferenceCategory extends Model {
    static associate(models) {
      PreferenceCategory.belongsToMany(models.User, {
        through: models.UserPreferenceCategory,
        foreignKey: "preferenceCategoryId",
        otherKey: "userId",
        as: "users"
      });
      PreferenceCategory.belongsToMany(models.Trip, {
        through: models.TripPreferenceCategory,
        foreignKey: "preferenceCategoryId",
        otherKey: "tripId",
        as: "trips"
      });
    }
  }

  PreferenceCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      slug: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "PreferenceCategory",
      tableName: "preference_categories",
      underscored: true
    }
  );

  return PreferenceCategory;
};
