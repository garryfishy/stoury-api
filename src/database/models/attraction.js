const { Model } = require("sequelize");

const ENRICHMENT_STATUSES = ["pending", "enriched", "needs_review", "failed"];

module.exports = (sequelize, DataTypes) => {
  class Attraction extends Model {
    static associate(models) {
      Attraction.belongsTo(models.Destination, {
        foreignKey: "destinationId",
        as: "destination"
      });
      Attraction.belongsToMany(models.AttractionCategory, {
        through: models.AttractionCategoryMapping,
        foreignKey: "attractionId",
        otherKey: "attractionCategoryId",
        as: "categories"
      });
      Attraction.hasMany(models.ItineraryItem, {
        foreignKey: "attractionId",
        as: "itineraryItems"
      });
    }
  }

  Attraction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      destinationId: {
        type: DataTypes.UUID,
        allowNull: false
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
      fullAddress: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
      },
      estimatedDurationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1
        }
      },
      openingHours: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 5
        }
      },
      thumbnailImageUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true
      },
      mainImageUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true
      },
      externalSource: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      externalPlaceId: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      externalRating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 5
        }
      },
      externalReviewCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      externalLastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      enrichmentStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: [ENRICHMENT_STATUSES]
        }
      },
      enrichmentError: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      enrichmentAttemptedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "Attraction",
      tableName: "attractions",
      underscored: true
    }
  );

  return Attraction;
};
