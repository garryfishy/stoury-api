const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
      User.hasMany(models.Trip, { foreignKey: "userId", as: "trips" });
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: "userId",
        otherKey: "roleId",
        as: "roles"
      });
      User.belongsToMany(models.PreferenceCategory, {
        through: models.UserPreferenceCategory,
        foreignKey: "userId",
        otherKey: "preferenceCategoryId",
        as: "preferenceCategories"
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      fullName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      underscored: true
    }
  );

  return User;
};
