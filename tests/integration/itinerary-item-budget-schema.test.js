const { randomUUID } = require("crypto");
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

describe("itinerary item budget estimate schema", () => {
  test("ItineraryItem model exposes optional budget estimate fields with validation", async () => {
    expect(db.ItineraryItem.rawAttributes.estimatedBudgetMin).toEqual(
      expect.objectContaining({
        allowNull: true,
      })
    );
    expect(db.ItineraryItem.rawAttributes.estimatedBudgetMax).toEqual(
      expect.objectContaining({
        allowNull: true,
      })
    );
    expect(db.ItineraryItem.rawAttributes.estimatedBudgetNote).toEqual(
      expect.objectContaining({
        allowNull: true,
      })
    );

    const validItem = db.ItineraryItem.build({
      itineraryDayId: randomUUID(),
      tripId: randomUUID(),
      attractionId: seedData.attractions["barelang-bridge"].id,
      orderIndex: 1,
      estimatedBudgetMin: 0,
      estimatedBudgetMax: 25000,
      estimatedBudgetNote: "Parking and snacks only",
    });

    await expect(validItem.validate()).resolves.toMatchObject({
      estimatedBudgetMin: 0,
      estimatedBudgetMax: 25000,
      estimatedBudgetNote: "Parking and snacks only",
    });

    const invalidNegativeItem = db.ItineraryItem.build({
      itineraryDayId: randomUUID(),
      tripId: randomUUID(),
      attractionId: seedData.attractions["barelang-bridge"].id,
      orderIndex: 1,
      estimatedBudgetMin: -1,
    });

    await expect(invalidNegativeItem.validate()).rejects.toThrow(
      /Validation min on estimatedBudgetMin failed/
    );

    const invalidRangeItem = db.ItineraryItem.build({
      itineraryDayId: randomUUID(),
      tripId: randomUUID(),
      attractionId: seedData.attractions["barelang-bridge"].id,
      orderIndex: 1,
      estimatedBudgetMin: 50000,
      estimatedBudgetMax: 25000,
    });

    await expect(invalidRangeItem.validate()).rejects.toThrow(
      /estimatedBudgetMax must be greater than or equal to estimatedBudgetMin/
    );
  });

  test("database includes itinerary item budget columns and constraints", async () => {
    const columns = await db.sequelize.query(
      `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'itinerary_items'
          AND column_name IN (
            'estimated_budget_min',
            'estimated_budget_max',
            'estimated_budget_note'
          )
        ORDER BY column_name;
      `,
      { type: QueryTypes.SELECT }
    );

    const columnsByName = Object.fromEntries(
      columns.map((column) => [column.column_name, column])
    );

    expect(columnsByName.estimated_budget_min).toEqual(
      expect.objectContaining({
        data_type: "integer",
        is_nullable: "YES",
      })
    );
    expect(columnsByName.estimated_budget_max).toEqual(
      expect.objectContaining({
        data_type: "integer",
        is_nullable: "YES",
      })
    );
    expect(columnsByName.estimated_budget_note).toEqual(
      expect.objectContaining({
        data_type: "text",
        is_nullable: "YES",
      })
    );

    const constraints = await db.sequelize.query(
      `
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'itinerary_items'::regclass
          AND conname IN (
            'itinerary_items_estimated_budget_min_non_negative_check',
            'itinerary_items_estimated_budget_max_non_negative_check',
            'itinerary_items_estimated_budget_range_check'
          )
        ORDER BY conname;
      `,
      { type: QueryTypes.SELECT }
    );

    const constraintsByName = Object.fromEntries(
      constraints.map((constraint) => [constraint.conname, constraint.definition])
    );

    expect(constraintsByName.itinerary_items_estimated_budget_min_non_negative_check).toContain(
      "estimated_budget_min"
    );
    expect(constraintsByName.itinerary_items_estimated_budget_max_non_negative_check).toContain(
      "estimated_budget_max"
    );
    expect(constraintsByName.itinerary_items_estimated_budget_range_check).toContain(
      "estimated_budget_max >= estimated_budget_min"
    );
  });

  test("real DB rows can persist and reload itinerary item budget estimates", async () => {
    const transaction = await db.sequelize.transaction();

    try {
      const user = await db.User.create(
        {
          email: `qa-int-budget-${Date.now()}@example.com`,
          fullName: "Budget Schema Test User",
          passwordHash: "not-used-in-this-test",
        },
        { transaction }
      );

      const trip = await db.Trip.create(
        {
          userId: user.id,
          destinationId: seedData.destinations.batam.id,
          title: "Budget Schema Verification Trip",
          planningMode: "manual",
          startDate: "2027-04-01",
          endDate: "2027-04-01",
          budget: 1000000,
        },
        { transaction }
      );

      const itinerary = await db.Itinerary.create(
        {
          tripId: trip.id,
        },
        { transaction }
      );

      const day = await db.ItineraryDay.create(
        {
          itineraryId: itinerary.id,
          tripId: trip.id,
          dayNumber: 1,
          tripDate: "2027-04-01",
        },
        { transaction }
      );

      const item = await db.ItineraryItem.create(
        {
          itineraryDayId: day.id,
          tripId: trip.id,
          attractionId: seedData.attractions["barelang-bridge"].id,
          orderIndex: 1,
          source: "manual",
          estimatedBudgetMin: 0,
          estimatedBudgetMax: 25000,
          estimatedBudgetNote: "Parking and optional snacks",
        },
        { transaction }
      );

      const reloadedItem = await db.ItineraryItem.findByPk(item.id, { transaction });

      expect(reloadedItem).toEqual(
        expect.objectContaining({
          estimatedBudgetMin: 0,
          estimatedBudgetMax: 25000,
          estimatedBudgetNote: "Parking and optional snacks",
        })
      );
    } finally {
      await transaction.rollback();
    }
  });
});
