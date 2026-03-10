const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AttractionCategory extends Model {
    static associate(models) {
      AttractionCategory.belongsToMany(models.Attraction, {
        through: models.AttractionCategoryMapping,
        foreignKey: "attractionCategoryId",
        otherKey: "attractionId",
        as: "attractions"
      });
    }
  }

  AttractionCategory.init(
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
      modelName: "AttractionCategory",
      tableName: "attraction_categories",
      underscored: true
    }
  );

  return AttractionCategory;
};
