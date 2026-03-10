const { Model } = require("sequelize");
const { DESTINATION_TYPES } = require("../constants");

module.exports = (sequelize, DataTypes) => {
  class Destination extends Model {
    static associate(models) {
      Destination.hasMany(models.Attraction, {
        foreignKey: "destinationId",
        as: "attractions"
      });
      Destination.hasMany(models.Trip, { foreignKey: "destinationId", as: "trips" });
    }
  }

  Destination.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false
      },
      slug: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      destinationType: {
        type: DataTypes.ENUM(...DESTINATION_TYPES),
        allowNull: false
      },
      countryCode: {
        type: DataTypes.STRING(2),
        allowNull: false,
        defaultValue: "ID"
      },
      countryName: {
        type: DataTypes.STRING(128),
        allowNull: false,
        defaultValue: "Indonesia"
      },
      provinceName: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      cityName: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      regionName: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      heroImageUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
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
      modelName: "Destination",
      tableName: "destinations",
      underscored: true
    }
  );

  return Destination;
};
