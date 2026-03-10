const { Model } = require("sequelize");
const { PLANNING_MODES } = require("../constants");

module.exports = (sequelize, DataTypes) => {
  class Trip extends Model {
    static associate(models) {
      Trip.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      Trip.belongsTo(models.Destination, {
        foreignKey: "destinationId",
        as: "destination"
      });
      Trip.hasOne(models.Itinerary, { foreignKey: "tripId", as: "itinerary" });
      Trip.belongsToMany(models.PreferenceCategory, {
        through: models.TripPreferenceCategory,
        foreignKey: "tripId",
        otherKey: "preferenceCategoryId",
        as: "preferenceCategories"
      });
      Trip.hasMany(models.ItineraryDay, { foreignKey: "tripId", as: "itineraryDays" });
      Trip.hasMany(models.ItineraryItem, { foreignKey: "tripId", as: "itineraryItems" });
    }
  }

  Trip.init(
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
      destinationId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      planningMode: {
        type: DataTypes.ENUM(...PLANNING_MODES),
        allowNull: false
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      budget: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0
        }
      }
    },
    {
      sequelize,
      modelName: "Trip",
      tableName: "trips",
      underscored: true
    }
  );

  return Trip;
};
