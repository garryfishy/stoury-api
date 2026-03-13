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
      estimatedBudgetMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      estimatedBudgetMax: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      estimatedBudgetNote: {
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
      underscored: true,
      validate: {
        estimatedBudgetRangeConsistency() {
          if (
            this.estimatedBudgetMin !== null &&
            this.estimatedBudgetMin !== undefined &&
            this.estimatedBudgetMax !== null &&
            this.estimatedBudgetMax !== undefined &&
            this.estimatedBudgetMax < this.estimatedBudgetMin
          ) {
            throw new Error(
              "estimatedBudgetMax must be greater than or equal to estimatedBudgetMin."
            );
          }
        }
      }
    }
  );

  return ItineraryItem;
};
