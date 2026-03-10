const { QueryTypes } = require("sequelize");
const { closeTestDb, db, ensureTestDbReady } = require("./helpers/db");
const { loadSeedData } = require("./helpers/seed-data");

let seedData;

beforeAll(async () => {
  await ensureTestDbReady();
  seedData = await loadSeedData();
});

afterAll(async () => {
  await closeTestDb();
});

describe("attraction enrichment state schema", () => {
  test("Attraction model exposes the enrichment workflow fields with validation", async () => {
    expect(db.Attraction.rawAttributes.enrichmentStatus).toEqual(
      expect.objectContaining({
        allowNull: false,
        defaultValue: "pending",
      })
    );
    expect(db.Attraction.rawAttributes.enrichmentError).toEqual(
      expect.objectContaining({
        allowNull: true,
      })
    );
    expect(db.Attraction.rawAttributes.enrichmentAttemptedAt).toEqual(
      expect.objectContaining({
        allowNull: true,
      })
    );

    const validAttraction = db.Attraction.build({
      destinationId: seedData.destinations.batam.id,
      name: "Temp Enrichment Validation Attraction",
      slug: `temp-enrichment-validation-${Date.now()}`,
      enrichmentStatus: "needs_review",
    });

    await expect(validAttraction.validate()).resolves.toMatchObject({
      enrichmentStatus: "needs_review",
    });

    const invalidAttraction = db.Attraction.build({
      destinationId: seedData.destinations.batam.id,
      name: "Temp Invalid Enrichment Attraction",
      slug: `temp-invalid-enrichment-${Date.now()}`,
      enrichmentStatus: "unknown_state",
    });

    await expect(invalidAttraction.validate()).rejects.toThrow(
      /Validation isIn on enrichmentStatus failed/
    );
  });

  test("database includes enrichment columns, constraint, and indexes", async () => {
    const columns = await db.sequelize.query(
      `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'attractions'
          AND column_name IN (
            'enrichment_status',
            'enrichment_error',
            'enrichment_attempted_at',
            'external_last_synced_at'
          )
        ORDER BY column_name;
      `,
      { type: QueryTypes.SELECT }
    );

    const columnsByName = Object.fromEntries(
      columns.map((column) => [column.column_name, column])
    );

    expect(columnsByName.enrichment_status).toEqual(
      expect.objectContaining({
        data_type: "character varying",
        is_nullable: "NO",
      })
    );
    expect(columnsByName.enrichment_status.column_default).toContain("pending");
    expect(columnsByName.enrichment_error).toEqual(
      expect.objectContaining({
        data_type: "text",
        is_nullable: "YES",
      })
    );
    expect(columnsByName.enrichment_attempted_at).toEqual(
      expect.objectContaining({
        data_type: "timestamp with time zone",
        is_nullable: "YES",
      })
    );
    expect(columnsByName.external_last_synced_at).toEqual(
      expect.objectContaining({
        data_type: "timestamp with time zone",
        is_nullable: "YES",
      })
    );

    const constraints = await db.sequelize.query(
      `
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'attractions'::regclass
          AND conname = 'attractions_enrichment_status_check';
      `,
      { type: QueryTypes.SELECT }
    );

    expect(constraints).toHaveLength(1);
    expect(constraints[0].definition).toContain("enrichment_status");
    expect(constraints[0].definition).toContain("pending");
    expect(constraints[0].definition).toContain("enriched");
    expect(constraints[0].definition).toContain("needs_review");
    expect(constraints[0].definition).toContain("failed");

    const indexes = await db.sequelize.query(
      `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'attractions'
          AND indexname IN (
            'attractions_enrichment_status_idx',
            'attractions_external_last_synced_at_idx',
            'attractions_enrichment_status_destination_sync_idx',
            'attractions_external_source_place_id_unique'
          )
        ORDER BY indexname;
      `,
      { type: QueryTypes.SELECT }
    );

    const indexesByName = Object.fromEntries(
      indexes.map((index) => [index.indexname, index.indexdef])
    );

    expect(indexesByName.attractions_enrichment_status_idx).toContain("enrichment_status");
    expect(indexesByName.attractions_external_last_synced_at_idx).toContain(
      "external_last_synced_at"
    );
    expect(indexesByName.attractions_enrichment_status_destination_sync_idx).toContain(
      "enrichment_status"
    );
    expect(indexesByName.attractions_enrichment_status_destination_sync_idx).toContain(
      "destination_id"
    );
    expect(indexesByName.attractions_enrichment_status_destination_sync_idx).toContain(
      "external_last_synced_at"
    );
    expect(indexesByName.attractions_external_source_place_id_unique).toContain(
      "external_source"
    );
    expect(indexesByName.attractions_external_source_place_id_unique).toContain(
      "external_place_id"
    );
  });

  test("seeded attractions were backfilled to pending when no external place is attached", async () => {
    const attraction = await db.Attraction.findByPk(seedData.attractions["tanah-lot"].id);

    expect(attraction).toEqual(
      expect.objectContaining({
        externalPlaceId: null,
        enrichmentStatus: "pending",
        enrichmentError: null,
        enrichmentAttemptedAt: null,
      })
    );
  });
});
