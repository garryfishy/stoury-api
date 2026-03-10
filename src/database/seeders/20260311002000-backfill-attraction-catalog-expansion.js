"use strict";

const { catalogExpansionAttractions } = require("./data/catalog");

const toInsertableAttraction = (destinationBySlug, attraction, now) => {
  const { destinationSlug, categories, ...data } = attraction;

  return {
    ...data,
    opening_hours: JSON.stringify(data.opening_hours || {}),
    metadata: JSON.stringify(data.metadata || {}),
    destination_id: destinationBySlug.get(destinationSlug),
    created_at: now,
    updated_at: now,
  };
};

module.exports = {
  async up(queryInterface) {
    const [destinationRows] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM destinations;"
    );
    const [existingAttractionRows] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM attractions;"
    );

    const destinationBySlug = new Map(destinationRows.map((row) => [row.slug, row.id]));
    const existingAttractionSlugs = new Set(existingAttractionRows.map((row) => row.slug));
    const now = new Date();

    const missingAttractions = catalogExpansionAttractions
      .filter((attraction) => !existingAttractionSlugs.has(attraction.slug))
      .map((attraction) => toInsertableAttraction(destinationBySlug, attraction, now));

    if (missingAttractions.length) {
      await queryInterface.bulkInsert("attractions", missingAttractions);
    }

    await queryInterface.bulkUpdate(
      "attractions",
      {
        thumbnail_image_url: null,
        main_image_url: null,
        updated_at: now,
      },
      {
        slug: catalogExpansionAttractions.map((attraction) => attraction.slug),
      }
    );

    const [attractionRows] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM attractions;"
    );
    const [categoryRows] = await queryInterface.sequelize.query(
      "SELECT id, slug FROM attraction_categories;"
    );
    const [existingMappingRows] = await queryInterface.sequelize.query(
      "SELECT attraction_id, attraction_category_id FROM attraction_category_mappings;"
    );

    const attractionBySlug = new Map(attractionRows.map((row) => [row.slug, row.id]));
    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));
    const existingMappings = new Set(
      existingMappingRows.map(
        (row) => `${row.attraction_id}:${row.attraction_category_id}`
      )
    );

    const missingMappings = catalogExpansionAttractions.flatMap((attraction) =>
      attraction.categories
        .map((categorySlug) => ({
          attraction_id: attractionBySlug.get(attraction.slug),
          attraction_category_id: categoryBySlug.get(categorySlug),
          created_at: now,
          updated_at: now,
        }))
        .filter(
          (mapping) =>
            mapping.attraction_id &&
            mapping.attraction_category_id &&
            !existingMappings.has(
              `${mapping.attraction_id}:${mapping.attraction_category_id}`
            )
        )
    );

    if (missingMappings.length) {
      await queryInterface.bulkInsert("attraction_category_mappings", missingMappings);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("attractions", {
      slug: catalogExpansionAttractions.map((attraction) => attraction.slug),
    });
  },
};
