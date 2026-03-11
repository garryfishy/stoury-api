"use strict";

const ACTIVE_PREFERENCES = {
  popular: {
    name: "Popular",
    slug: "popular",
    description: "Popular highlights and must-see attractions across the destination.",
    sortOrder: 1,
  },
  food: {
    name: "Makanan",
    slug: "food",
    description: "Local cuisine, food streets, cafes, and culinary destinations.",
    sortOrder: 2,
  },
  shopping: {
    name: "Belanja",
    slug: "shopping",
    description: "Malls, markets, artisan stores, and retail districts.",
    sortOrder: 3,
  },
  history: {
    name: "History",
    slug: "history",
    description: "Historical sites, heritage areas, temples, and cultural landmarks.",
    sortOrder: 4,
  },
};

const LEGACY_PREFERENCES = {
  nature: {
    name: "Nature Escapes",
    slug: "nature",
    description: "Outdoor experiences, parks, beaches, and scenic landscapes.",
    sortOrder: 1,
    isActive: true,
  },
  culture: {
    name: "Culture & Heritage",
    slug: "culture",
    description: "Temples, museums, historical sites, and local traditions.",
    sortOrder: 2,
    isActive: true,
  },
  food: {
    name: "Food Hunting",
    slug: "food",
    description: "Local cuisine, food streets, cafes, and culinary destinations.",
    sortOrder: 3,
    isActive: true,
  },
  shopping: {
    name: "Shopping",
    slug: "shopping",
    description: "Malls, markets, artisan stores, and retail districts.",
    sortOrder: 4,
    isActive: true,
  },
  relaxation: {
    name: "Relaxation",
    slug: "relaxation",
    description: "Low-pressure downtime, spa zones, and slower-paced stops.",
    sortOrder: 5,
    isActive: true,
  },
  adventure: {
    name: "Adventure",
    slug: "adventure",
    description: "High-energy activities, tours, and active exploration.",
    sortOrder: 6,
    isActive: true,
  },
  family: {
    name: "Family Friendly",
    slug: "family",
    description: "Places that work well for mixed-age groups.",
    sortOrder: 7,
    isActive: true,
  },
  nightlife: {
    name: "Nightlife",
    slug: "nightlife",
    description: "Evening hangouts, sunset spots, clubs, and live entertainment.",
    sortOrder: 8,
    isActive: true,
  },
};

const DEPRECATED_SLUGS = ["relaxation", "adventure", "family", "nightlife"];

const updatePreferenceCategory = async (
  queryInterface,
  transaction,
  rowId,
  { name, slug, description, sortOrder, isActive = true }
) => {
  if (!rowId) {
    return;
  }

  await queryInterface.bulkUpdate(
    "preference_categories",
    {
      name,
      slug,
      description,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date(),
    },
    { id: rowId },
    { transaction }
  );
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [rows] = await queryInterface.sequelize.query(
        `
          SELECT id, slug
          FROM preference_categories
          WHERE slug IN (
            'nature',
            'popular',
            'culture',
            'history',
            'food',
            'shopping',
            'relaxation',
            'adventure',
            'family',
            'nightlife'
          );
        `,
        { transaction }
      );

      if (!rows.length) {
        await transaction.commit();
        return;
      }

      const rowBySlug = Object.fromEntries(rows.map((row) => [row.slug, row]));
      const popularId = rowBySlug.nature?.id || rowBySlug.popular?.id || null;
      const historyId = rowBySlug.culture?.id || rowBySlug.history?.id || null;
      const deprecatedIds = DEPRECATED_SLUGS.map((slug) => rowBySlug[slug]?.id).filter(Boolean);

      await updatePreferenceCategory(queryInterface, transaction, popularId, ACTIVE_PREFERENCES.popular);
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.food?.id,
        ACTIVE_PREFERENCES.food
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.shopping?.id,
        ACTIVE_PREFERENCES.shopping
      );
      await updatePreferenceCategory(queryInterface, transaction, historyId, ACTIVE_PREFERENCES.history);

      if (popularId && deprecatedIds.length) {
        await queryInterface.sequelize.query(
          `
            WITH ranked AS (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  PARTITION BY
                    user_id,
                    CASE
                      WHEN preference_category_id IN (:deprecatedIds) THEN :popularId
                      ELSE preference_category_id
                    END
                  ORDER BY created_at ASC, id ASC
                ) AS row_number
              FROM user_preference_categories
              WHERE preference_category_id IN (:deprecatedIds)
                 OR preference_category_id = :popularId
            )
            DELETE FROM user_preference_categories upc
            USING ranked
            WHERE upc.id = ranked.id
              AND ranked.row_number > 1;
          `,
          {
            replacements: {
              deprecatedIds,
              popularId,
            },
            transaction,
          }
        );

        await queryInterface.sequelize.query(
          `
            UPDATE user_preference_categories
            SET preference_category_id = :popularId,
                updated_at = NOW()
            WHERE preference_category_id IN (:deprecatedIds);
          `,
          {
            replacements: {
              deprecatedIds,
              popularId,
            },
            transaction,
          }
        );

        await queryInterface.sequelize.query(
          `
            WITH ranked AS (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  PARTITION BY
                    trip_id,
                    CASE
                      WHEN preference_category_id IN (:deprecatedIds) THEN :popularId
                      ELSE preference_category_id
                    END
                  ORDER BY created_at ASC, id ASC
                ) AS row_number
              FROM trip_preference_categories
              WHERE preference_category_id IN (:deprecatedIds)
                 OR preference_category_id = :popularId
            )
            DELETE FROM trip_preference_categories tpc
            USING ranked
            WHERE tpc.id = ranked.id
              AND ranked.row_number > 1;
          `,
          {
            replacements: {
              deprecatedIds,
              popularId,
            },
            transaction,
          }
        );

        await queryInterface.sequelize.query(
          `
            UPDATE trip_preference_categories
            SET preference_category_id = :popularId,
                updated_at = NOW()
            WHERE preference_category_id IN (:deprecatedIds);
          `,
          {
            replacements: {
              deprecatedIds,
              popularId,
            },
            transaction,
          }
        );
      }

      if (deprecatedIds.length) {
        await queryInterface.bulkUpdate(
          "preference_categories",
          {
            is_active: false,
            updated_at: new Date(),
          },
          {
            id: deprecatedIds,
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [rows] = await queryInterface.sequelize.query(
        `
          SELECT id, slug
          FROM preference_categories
          WHERE slug IN (
            'popular',
            'history',
            'food',
            'shopping',
            'relaxation',
            'adventure',
            'family',
            'nightlife'
          );
        `,
        { transaction }
      );

      if (!rows.length) {
        await transaction.commit();
        return;
      }

      const rowBySlug = Object.fromEntries(rows.map((row) => [row.slug, row]));

      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.popular?.id,
        LEGACY_PREFERENCES.nature
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.history?.id,
        LEGACY_PREFERENCES.culture
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.food?.id,
        LEGACY_PREFERENCES.food
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.shopping?.id,
        LEGACY_PREFERENCES.shopping
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.relaxation?.id,
        LEGACY_PREFERENCES.relaxation
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.adventure?.id,
        LEGACY_PREFERENCES.adventure
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.family?.id,
        LEGACY_PREFERENCES.family
      );
      await updatePreferenceCategory(
        queryInterface,
        transaction,
        rowBySlug.nightlife?.id,
        LEGACY_PREFERENCES.nightlife
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
