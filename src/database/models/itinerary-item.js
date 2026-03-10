const { Model } = require("sequelize");
const { ITINERARY_ITEM_SOURCES } = require("../constants");

module.exports = (sequelize, DataTypes) => {
  class ItineraryItem extends Model {
    static associate(models) {
      ItineraryItem.belongsTo(models.ItineraryDay, {
        foreignKey: "itineraryDayId",
        as: "day"
      });
      ItineraryItem.belongsTo(models.Trip, { foreignKey: "tripId", as: "trip" });
      ItineraryItem.belongsTo(models.Attraction, {
        foreignKey: "attractionId",
        as: "attraction"
      });
    }
  }

  ItineraryItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      itineraryDayId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      attractionId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: true
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      source: {
        type: DataTypes.ENUM(...ITINERARY_ITEM_SOURCES),
        allowNull: false,
        defaultValue: "manual"
      }
    },
    {
      sequelize,
      modelName: "ItineraryItem",
      tableName: "itinerary_items",
      underscored: true
    }
  );

  return ItineraryItem;
};
