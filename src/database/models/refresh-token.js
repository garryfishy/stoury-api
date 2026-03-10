const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RefreshToken extends Model {
    static associate(models) {
      RefreshToken.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      RefreshToken.belongsTo(models.RefreshToken, {
        foreignKey: "replacedByTokenId",
        as: "replacedByToken"
      });
      RefreshToken.hasOne(models.RefreshToken, {
        foreignKey: "replacedByTokenId",
        as: "replacedToken"
      });
    }
  }

  RefreshToken.init(
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
      tokenHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      replacedByTokenId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      createdByIp: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      userAgent: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "RefreshToken",
      tableName: "refresh_tokens",
      underscored: true
    }
  );

  return RefreshToken;
};
