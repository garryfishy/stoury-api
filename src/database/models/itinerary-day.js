const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ItineraryDay extends Model {
    static associate(models) {
      ItineraryDay.belongsTo(models.Itinerary, {
        foreignKey: "itineraryId",
        as: "itinerary"
      });
      ItineraryDay.belongsTo(models.Trip, { foreignKey: "tripId", as: "trip" });
      ItineraryDay.hasMany(models.ItineraryItem, {
        foreignKey: "itineraryDayId",
        as: "items"
      });
    }
  }

  ItineraryDay.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      itineraryId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      dayNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      tripDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "ItineraryDay",
      tableName: "itinerary_days",
      underscored: true
    }
  );

  return ItineraryDay;
};
