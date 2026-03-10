const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Itinerary extends Model {
    static associate(models) {
      Itinerary.belongsTo(models.Trip, { foreignKey: "tripId", as: "trip" });
      Itinerary.hasMany(models.ItineraryDay, {
        foreignKey: "itineraryId",
        as: "days"
      });
    }
  }

  Itinerary.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      }
    },
    {
      sequelize,
      modelName: "Itinerary",
      tableName: "itineraries",
      underscored: true
    }
  );

  return Itinerary;
};
