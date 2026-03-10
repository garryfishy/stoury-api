"use strict";

const {
  DESTINATION_TYPES,
  PLANNING_MODES,
  ITINERARY_ITEM_SOURCES
} = require("../constants");

const uuidPrimaryKey = (Sequelize) => ({
  type: Sequelize.UUID,
  allowNull: false,
  defaultValue: Sequelize.literal("gen_random_uuid()"),
  primaryKey: true
});

const timestamps = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("NOW()")
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("NOW()")
  }
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // These extensions must exist before UUID defaults and the trip exclusion
      // constraint are created later in this migration.
      await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;", {
        transaction
      });
      await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS btree_gist;", {
        transaction
      });

      await queryInterface.createTable(
        "roles",
        {
          id: uuidPrimaryKey(Sequelize),
          code: {
            type: Sequelize.STRING(64),
            allowNull: false,
            unique: true
          },
          name: {
            type: Sequelize.STRING(128),
            allowNull: false
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.createTable(
        "users",
        {
          id: uuidPrimaryKey(Sequelize),
          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true
          },
          full_name: {
            type: Sequelize.STRING(255),
            allowNull: true
          },
          password_hash: {
            type: Sequelize.STRING(255),
            allowNull: false
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          last_login_at: {
            type: Sequelize.DATE,
            allowNull: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.createTable(
        "user_roles",
        {
          id: uuidPrimaryKey(Sequelize),
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          role_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "roles",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.addConstraint("user_roles", {
        fields: ["user_id", "role_id"],
        type: "unique",
        name: "user_roles_user_id_role_id_unique",
        transaction
      });

      await queryInterface.createTable(
        "refresh_tokens",
        {
          id: uuidPrimaryKey(Sequelize),
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          token_hash: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: false
          },
          revoked_at: {
            type: Sequelize.DATE,
            allowNull: true
          },
          replaced_by_token_id: {
            type: Sequelize.UUID,
            allowNull: true
          },
          created_by_ip: {
            type: Sequelize.STRING(64),
            allowNull: true
          },
          user_agent: {
            type: Sequelize.STRING(512),
            allowNull: true
          },
          last_used_at: {
            type: Sequelize.DATE,
            allowNull: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.addConstraint("refresh_tokens", {
        fields: ["replaced_by_token_id"],
        type: "foreign key",
        name: "refresh_tokens_replaced_by_token_id_fkey",
        references: {
          table: "refresh_tokens",
          field: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        transaction
      });

      await queryInterface.sequelize.query(
        `
          ALTER TABLE refresh_tokens
          ADD CONSTRAINT refresh_tokens_expires_after_created_at_check
          CHECK (expires_at > created_at);
        `,
        { transaction }
      );

      await queryInterface.createTable(
        "preference_categories",
        {
          id: uuidPrimaryKey(Sequelize),
          name: {
            type: Sequelize.STRING(128),
            allowNull: false
          },
          slug: {
            type: Sequelize.STRING(128),
            allowNull: false,
            unique: true
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.createTable(
        "destinations",
        {
          id: uuidPrimaryKey(Sequelize),
          name: {
            type: Sequelize.STRING(160),
            allowNull: false
          },
          slug: {
            type: Sequelize.STRING(160),
            allowNull: false,
            unique: true
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          destination_type: {
            type: Sequelize.ENUM(...DESTINATION_TYPES),
            allowNull: false
          },
          country_code: {
            type: Sequelize.CHAR(2),
            allowNull: false,
            defaultValue: "ID"
          },
          country_name: {
            type: Sequelize.STRING(128),
            allowNull: false,
            defaultValue: "Indonesia"
          },
          province_name: {
            type: Sequelize.STRING(128),
            allowNull: true
          },
          city_name: {
            type: Sequelize.STRING(128),
            allowNull: true
          },
          region_name: {
            type: Sequelize.STRING(128),
            allowNull: true
          },
          hero_image_url: {
            type: Sequelize.STRING(1024),
            allowNull: true
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {}
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.createTable(
        "attraction_categories",
        {
          id: uuidPrimaryKey(Sequelize),
          name: {
            type: Sequelize.STRING(128),
            allowNull: false
          },
          slug: {
            type: Sequelize.STRING(128),
            allowNull: false,
            unique: true
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.createTable(
        "attractions",
        {
          id: uuidPrimaryKey(Sequelize),
          destination_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "destinations",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          name: {
            type: Sequelize.STRING(160),
            allowNull: false
          },
          slug: {
            type: Sequelize.STRING(160),
            allowNull: false,
            unique: true
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          full_address: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          latitude: {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
          },
          longitude: {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
          },
          estimated_duration_minutes: {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          opening_hours: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {}
          },
          rating: {
            type: Sequelize.DECIMAL(2, 1),
            allowNull: true
          },
          thumbnail_image_url: {
            type: Sequelize.STRING(1024),
            allowNull: true
          },
          main_image_url: {
            type: Sequelize.STRING(1024),
            allowNull: true
          },
          external_source: {
            type: Sequelize.STRING(64),
            allowNull: true
          },
          external_place_id: {
            type: Sequelize.STRING(255),
            allowNull: true
          },
          external_rating: {
            type: Sequelize.DECIMAL(2, 1),
            allowNull: true
          },
          external_review_count: {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          external_last_synced_at: {
            type: Sequelize.DATE,
            allowNull: true
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {}
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE attractions
          ADD CONSTRAINT attractions_estimated_duration_positive_check
          CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
          ADD CONSTRAINT attractions_rating_range_check
          CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
          ADD CONSTRAINT attractions_external_rating_range_check
          CHECK (external_rating IS NULL OR (external_rating >= 0 AND external_rating <= 5)),
          ADD CONSTRAINT attractions_external_review_count_positive_check
          CHECK (external_review_count IS NULL OR external_review_count >= 0);
        `,
        { transaction }
      );

      await queryInterface.createTable(
        "attraction_category_mappings",
        {
          id: uuidPrimaryKey(Sequelize),
          attraction_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "attractions",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          attraction_category_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "attraction_categories",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.addConstraint("attraction_category_mappings", {
        fields: ["attraction_id", "attraction_category_id"],
        type: "unique",
        name: "attraction_category_mappings_unique_pair",
        transaction
      });

      await queryInterface.createTable(
        "trips",
        {
          id: uuidPrimaryKey(Sequelize),
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          destination_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "destinations",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT"
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false
          },
          planning_mode: {
            type: Sequelize.ENUM(...PLANNING_MODES),
            allowNull: false
          },
          start_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
          },
          end_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
          },
          budget: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE trips
          ADD CONSTRAINT trips_date_range_check
          CHECK (start_date <= end_date),
          ADD CONSTRAINT trips_budget_non_negative_check
          CHECK (budget IS NULL OR budget >= 0);
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE trips
          ADD CONSTRAINT trips_no_same_destination_overlap
          EXCLUDE USING gist (
            user_id WITH =,
            destination_id WITH =,
            daterange(start_date, end_date, '[]') WITH &&
          );
        `,
        { transaction }
      );

      await queryInterface.createTable(
        "trip_preference_categories",
        {
          id: uuidPrimaryKey(Sequelize),
          trip_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "trips",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          preference_category_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "preference_categories",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT"
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.addConstraint("trip_preference_categories", {
        fields: ["trip_id", "preference_category_id"],
        type: "unique",
        name: "trip_preference_categories_unique_pair",
        transaction
      });

      await queryInterface.createTable(
        "user_preference_categories",
        {
          id: uuidPrimaryKey(Sequelize),
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          preference_category_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "preference_categories",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT"
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.addConstraint("user_preference_categories", {
        fields: ["user_id", "preference_category_id"],
        type: "unique",
        name: "user_preference_categories_unique_pair",
        transaction
      });

      await queryInterface.createTable(
        "itineraries",
        {
          id: uuidPrimaryKey(Sequelize),
          trip_id: {
            type: Sequelize.UUID,
            allowNull: false,
            unique: true,
            references: {
              model: "trips",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.createTable(
        "itinerary_days",
        {
          id: uuidPrimaryKey(Sequelize),
          itinerary_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "itineraries",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          trip_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "trips",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          day_number: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          trip_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE itinerary_days
          ADD CONSTRAINT itinerary_days_day_number_positive_check
          CHECK (day_number >= 1);
        `,
        { transaction }
      );

      await queryInterface.addConstraint("itinerary_days", {
        fields: ["itinerary_id", "day_number"],
        type: "unique",
        name: "itinerary_days_itinerary_id_day_number_unique",
        transaction
      });

      await queryInterface.addConstraint("itinerary_days", {
        fields: ["trip_id", "day_number"],
        type: "unique",
        name: "itinerary_days_trip_id_day_number_unique",
        transaction
      });

      await queryInterface.addConstraint("itinerary_days", {
        fields: ["trip_id", "trip_date"],
        type: "unique",
        name: "itinerary_days_trip_id_trip_date_unique",
        transaction
      });

      await queryInterface.addConstraint("itinerary_days", {
        fields: ["id", "trip_id"],
        type: "unique",
        name: "itinerary_days_id_trip_id_unique",
        transaction
      });

      await queryInterface.createTable(
        "itinerary_items",
        {
          id: uuidPrimaryKey(Sequelize),
          itinerary_day_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "itinerary_days",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          trip_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "trips",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          attraction_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "attractions",
              key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT"
          },
          order_index: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          start_time: {
            type: Sequelize.TIME,
            allowNull: true
          },
          end_time: {
            type: Sequelize.TIME,
            allowNull: true
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          source: {
            type: Sequelize.ENUM(...ITINERARY_ITEM_SOURCES),
            allowNull: false,
            defaultValue: "manual"
          },
          ...timestamps(Sequelize)
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE itinerary_items
          ADD CONSTRAINT itinerary_items_order_index_positive_check
          CHECK (order_index >= 1),
          ADD CONSTRAINT itinerary_items_time_window_check
          CHECK (
            start_time IS NULL
            OR end_time IS NULL
            OR start_time < end_time
          );
        `,
        { transaction }
      );

      await queryInterface.addConstraint("itinerary_items", {
        fields: ["trip_id", "attraction_id"],
        type: "unique",
        name: "itinerary_items_trip_id_attraction_id_unique",
        transaction
      });

      await queryInterface.addConstraint("itinerary_items", {
        fields: ["itinerary_day_id", "order_index"],
        type: "unique",
        name: "itinerary_items_day_order_unique",
        transaction
      });

      await queryInterface.addConstraint("itinerary_items", {
        fields: ["itinerary_day_id", "trip_id"],
        type: "foreign key",
        name: "itinerary_items_day_trip_fkey",
        references: {
          table: "itinerary_days",
          fields: ["id", "trip_id"]
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        transaction
      });

      await queryInterface.addIndex("trips", ["user_id"], {
        name: "trips_user_id_idx",
        transaction
      });

      await queryInterface.addIndex("trips", ["destination_id"], {
        name: "trips_destination_id_idx",
        transaction
      });

      await queryInterface.addIndex("attractions", ["destination_id"], {
        name: "attractions_destination_id_idx",
        transaction
      });

      await queryInterface.addIndex("itinerary_days", ["itinerary_id"], {
        name: "itinerary_days_itinerary_id_idx",
        transaction
      });

      await queryInterface.addIndex("itinerary_items", ["itinerary_day_id"], {
        name: "itinerary_items_itinerary_day_id_idx",
        transaction
      });

      await queryInterface.addIndex("refresh_tokens", ["user_id", "expires_at"], {
        name: "refresh_tokens_user_id_expires_at_idx",
        transaction
      });

      await queryInterface.addIndex("trip_preference_categories", ["trip_id"], {
        name: "trip_preference_categories_trip_id_idx",
        transaction
      });

      await queryInterface.addIndex("user_preference_categories", ["user_id"], {
        name: "user_preference_categories_user_id_idx",
        transaction
      });

      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX attractions_external_source_place_id_unique
          ON attractions (external_source, external_place_id)
          WHERE external_source IS NOT NULL AND external_place_id IS NOT NULL;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE OR REPLACE FUNCTION set_itinerary_day_fields()
          RETURNS trigger AS $$
          DECLARE
            linked_trip_id uuid;
            trip_start date;
            trip_end date;
            max_days integer;
          BEGIN
            SELECT i.trip_id, t.start_date, t.end_date
            INTO linked_trip_id, trip_start, trip_end
            FROM itineraries i
            JOIN trips t ON t.id = i.trip_id
            WHERE i.id = NEW.itinerary_id;

            IF linked_trip_id IS NULL THEN
              RAISE EXCEPTION 'Invalid itinerary_id % for itinerary_days row', NEW.itinerary_id;
            END IF;

            max_days := trip_end - trip_start + 1;

            IF NEW.day_number < 1 OR NEW.day_number > max_days THEN
              RAISE EXCEPTION 'day_number % is outside the trip range (1..%)', NEW.day_number, max_days;
            END IF;

            NEW.trip_id := linked_trip_id;
            NEW.trip_date := trip_start + (NEW.day_number - 1);

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE TRIGGER itinerary_days_set_trip_fields_trigger
          BEFORE INSERT OR UPDATE OF itinerary_id, day_number
          ON itinerary_days
          FOR EACH ROW
          EXECUTE FUNCTION set_itinerary_day_fields();
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE OR REPLACE FUNCTION enforce_itinerary_day_sequence(target_itinerary_id uuid)
          RETURNS void AS $$
          DECLARE
            day_count integer;
            min_day integer;
            max_day integer;
          BEGIN
            IF target_itinerary_id IS NULL THEN
              RETURN;
            END IF;

            SELECT COUNT(*), MIN(day_number), MAX(day_number)
            INTO day_count, min_day, max_day
            FROM itinerary_days
            WHERE itinerary_id = target_itinerary_id;

            IF day_count = 0 THEN
              RETURN;
            END IF;

            IF min_day <> 1 OR day_count <> max_day THEN
              RAISE EXCEPTION 'Itinerary days must be sequential starting at 1 for itinerary %', target_itinerary_id;
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE OR REPLACE FUNCTION validate_itinerary_day_sequence_trigger()
          RETURNS trigger AS $$
          BEGIN
            IF TG_OP = 'DELETE' THEN
              PERFORM enforce_itinerary_day_sequence(OLD.itinerary_id);
              RETURN NULL;
            END IF;

            PERFORM enforce_itinerary_day_sequence(NEW.itinerary_id);

            IF TG_OP = 'UPDATE' AND OLD.itinerary_id IS DISTINCT FROM NEW.itinerary_id THEN
              PERFORM enforce_itinerary_day_sequence(OLD.itinerary_id);
            END IF;

            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE CONSTRAINT TRIGGER itinerary_days_validate_sequence_trigger
          AFTER INSERT OR UPDATE OR DELETE
          ON itinerary_days
          DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW
          EXECUTE FUNCTION validate_itinerary_day_sequence_trigger();
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE OR REPLACE FUNCTION set_itinerary_item_trip_fields()
          RETURNS trigger AS $$
          DECLARE
            linked_trip_id uuid;
            trip_destination_id uuid;
            attraction_destination_id uuid;
          BEGIN
            SELECT d.trip_id, t.destination_id
            INTO linked_trip_id, trip_destination_id
            FROM itinerary_days d
            JOIN trips t ON t.id = d.trip_id
            WHERE d.id = NEW.itinerary_day_id;

            IF linked_trip_id IS NULL THEN
              RAISE EXCEPTION 'Invalid itinerary_day_id % for itinerary_items row', NEW.itinerary_day_id;
            END IF;

            SELECT destination_id
            INTO attraction_destination_id
            FROM attractions
            WHERE id = NEW.attraction_id;

            IF attraction_destination_id IS NULL THEN
              RAISE EXCEPTION 'Invalid attraction_id % for itinerary_items row', NEW.attraction_id;
            END IF;

            IF attraction_destination_id <> trip_destination_id THEN
              RAISE EXCEPTION 'Attraction % does not belong to trip destination', NEW.attraction_id;
            END IF;

            NEW.trip_id := linked_trip_id;

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          CREATE TRIGGER itinerary_items_set_trip_fields_trigger
          BEFORE INSERT OR UPDATE OF itinerary_day_id, attraction_id
          ON itinerary_items
          FOR EACH ROW
          EXECUTE FUNCTION set_itinerary_item_trip_fields();
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "DROP TRIGGER IF EXISTS itinerary_items_set_trip_fields_trigger ON itinerary_items;",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS set_itinerary_item_trip_fields();",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP TRIGGER IF EXISTS itinerary_days_validate_sequence_trigger ON itinerary_days;",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS validate_itinerary_day_sequence_trigger();",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS enforce_itinerary_day_sequence(uuid);",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP TRIGGER IF EXISTS itinerary_days_set_trip_fields_trigger ON itinerary_days;",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS set_itinerary_day_fields();",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "DROP INDEX IF EXISTS attractions_external_source_place_id_unique;",
        { transaction }
      );

      await queryInterface.dropTable("itinerary_items", { transaction });
      await queryInterface.dropTable("itinerary_days", { transaction });
      await queryInterface.dropTable("itineraries", { transaction });
      await queryInterface.dropTable("user_preference_categories", { transaction });
      await queryInterface.dropTable("trip_preference_categories", { transaction });
      await queryInterface.dropTable("trips", { transaction });
      await queryInterface.dropTable("attraction_category_mappings", { transaction });
      await queryInterface.dropTable("attractions", { transaction });
      await queryInterface.dropTable("attraction_categories", { transaction });
      await queryInterface.dropTable("destinations", { transaction });
      await queryInterface.dropTable("preference_categories", { transaction });
      await queryInterface.dropTable("refresh_tokens", { transaction });
      await queryInterface.dropTable("user_roles", { transaction });
      await queryInterface.dropTable("users", { transaction });
      await queryInterface.dropTable("roles", { transaction });

      await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_itinerary_items_source;", {
        transaction
      });
      await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_trips_planning_mode;", {
        transaction
      });
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS enum_destinations_destination_type;",
        { transaction }
      );
    });
  }
};
