const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TripPreferenceCategory extends Model {}

  TripPreferenceCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      preferenceCategoryId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "TripPreferenceCategory",
      tableName: "trip_preference_categories",
      underscored: true
    }
  );

  return TripPreferenceCategory;
};
