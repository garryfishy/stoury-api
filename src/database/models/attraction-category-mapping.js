const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AttractionCategoryMapping extends Model {}

  AttractionCategoryMapping.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      attractionId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      attractionCategoryId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "AttractionCategoryMapping",
      tableName: "attraction_category_mappings",
      underscored: true
    }
  );

  return AttractionCategoryMapping;
};
