process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.OPENAPI_SERVER_URL =
  process.env.OPENAPI_SERVER_URL || "http://43.157.208.56:2000";

const request = require("supertest");
const app = require("../src/app");
const { buildOpenApiDocument } = require("../src/docs/openapi");

describe("OpenAPI document", () => {
  test("includes documented trip, itinerary, AI planning, and admin enrichment paths", () => {
    const document = buildOpenApiDocument();

    expect(document.openapi).toBe("3.0.3");
    expect(document.servers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "http://localhost:3000",
        }),
        expect.objectContaining({
          url: "http://43.157.208.56:2000",
        }),
      ])
    );
    expect(document.paths["/api/auth/register"]).toBeDefined();
    expect(document.paths["/api/preferences"]).toBeDefined();
    expect(document.paths["/api/dashboard/home"]).toBeDefined();
    expect(document.paths["/api/dashboard/search"]).toBeDefined();
    expect(document.paths["/api/attractions/{idOrSlug}/photo"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/itinerary"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/ai-generate"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/enrichment-pending"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/{attractionId}/enrich"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/enrich-missing"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/backfill-photos"]).toBeDefined();
    expect(document.components.schemas.PaginationMeta).toBeDefined();
    expect(document.components.schemas.Destination.properties.isActive).toEqual(
      expect.objectContaining({
        type: "boolean",
      })
    );
    expect(document.paths["/api/destinations"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/PageQuery",
        }),
        expect.objectContaining({
          $ref: "#/components/parameters/CatalogLimitQuery",
        }),
      ])
    );
    expect(document.paths["/api/destinations"].get.description).toContain(
      "Inactive destinations may still appear"
    );
    expect(document.paths["/api/destinations/{idOrSlug}"].get.description).toContain(
      "inactive"
    );
    expect(document.paths["/api/destinations"].get.responses[200].content["application/json"].schema.properties.meta).toEqual(
      expect.objectContaining({
        $ref: "#/components/schemas/PaginationMeta",
      })
    );
    expect(document.paths["/api/destinations/{destinationId}/attractions"].get.responses[200].content["application/json"].schema.properties.meta).toEqual(
      expect.objectContaining({
        $ref: "#/components/schemas/PaginationMeta",
      })
    );
    expect(document.paths["/api/destinations/{destinationId}/attractions"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/AttractionSearchQuery",
        }),
      ])
    );
    expect(document.paths["/api/destinations/{destinationId}/attractions"].get.description).toContain(
      "UUID or stable slug"
    );
    expect(document.paths["/api/attractions/{idOrSlug}/photo"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "variant",
        }),
      ])
    );
    expect(document.paths["/api/dashboard/home"].get.description).toContain(
      "all active destinations"
    );
    expect(document.paths["/api/dashboard/search"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/AttractionSearchQuery",
        }),
      ])
    );
    expect(document.components.schemas.DashboardHomeCard.properties.badge.enum).toEqual(
      expect.arrayContaining(["Populer", "Makanan", "Belanja", "Sejarah"])
    );
    expect(document.components.schemas.DashboardHomeCard.properties.badgeKey.enum).toEqual(
      expect.arrayContaining(["popular", "food", "shopping", "history"])
    );
    expect(document.components.schemas.DashboardHomeCard.properties.destination).toEqual(
      expect.objectContaining({
        type: "object",
      })
    );
    expect(document.components.schemas.PreferenceCategory.properties.name.description).toContain(
      "Populer"
    );
    expect(document.paths["/api/preferences"].get.responses[200].content["application/json"].example.message).toBe(
      "Preference categories fetched."
    );
    expect(document.paths["/api/preferences"].get.security).toBeUndefined();
    expect(
      document.paths["/api/trips"].post.requestBody.content["application/json"].examples
    ).toEqual(
      expect.objectContaining({
        manualTrip: expect.any(Object),
        aiAssistedTrip: expect.any(Object),
      })
    );
    expect(document.paths["/api/trips"].post.requestBody.description).toContain(
      "Both planning modes use the same required trip-level `budget` field"
    );
    expect(document.paths["/api/trips"].post.description).toContain(
      "Overlapping trips are allowed"
    );
    expect(document.paths["/api/trips"].post.responses[409]).toBeUndefined();
    expect(document.components.schemas.PrimaryPreferenceBucket).toBeDefined();
    expect(document.components.schemas.Attraction.properties.primaryPreference).toEqual(
      expect.objectContaining({
        $ref: "#/components/schemas/PrimaryPreferenceBucket",
      })
    );
    expect(document.components.schemas.AttractionDetail).toBeDefined();
    expect(document.components.schemas.AttractionDetailPhoto).toBeDefined();
    expect(document.components.schemas.AttractionDetail.allOf[1].required).toEqual(
      expect.arrayContaining(["shortLocation", "photos"])
    );
    expect(
      document.paths["/api/attractions/{idOrSlug}"].get.responses[200].content[
        "application/json"
      ].schema.properties.data
    ).toEqual(
      expect.objectContaining({
        $ref: "#/components/schemas/AttractionDetail",
      })
    );
    expect(
      document.paths["/api/attractions/{idOrSlug}"].get.responses[200].content[
        "application/json"
      ].example.data
    ).toEqual(
      expect.objectContaining({
        shortLocation: expect.any(String),
        photos: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^(main|thumbnail)$/),
          }),
        ]),
      })
    );
    expect(document.components.schemas.ItineraryAttractionSummary.required).toEqual(
      expect.arrayContaining([
        "openingHours",
        "tripDayOpeningHours",
        "tripDayIsOpen",
        "primaryPreference",
      ])
    );
    expect(
      document.components.schemas.ItineraryAttractionSummary.properties.primaryPreference
    ).toEqual(
      expect.objectContaining({
        $ref: "#/components/schemas/PrimaryPreferenceBucket",
      })
    );
    expect(
      document.components.schemas.ItineraryAttractionSummary.properties.tripDayOpeningHours
    ).toEqual(
      expect.objectContaining({
        type: "array",
      })
    );
    expect(document.components.schemas.TripDayOpeningWindow).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/itinerary"].put.description).toContain(
      "rough budget estimate guidance"
    );
    expect(
      document.paths["/api/trips/{tripId}/itinerary"].put.requestBody.description
    ).toContain("rough guidance only");
    expect(document.paths["/api/trips/{tripId}/ai-generate"].post.description).toContain(
      "rough per-stop budget estimate fields"
    );
    expect(document.components.schemas.ItineraryItem.required).toEqual(
      expect.arrayContaining([
        "estimatedBudgetMin",
        "estimatedBudgetMax",
        "estimatedBudgetNote",
      ])
    );
    expect(document.components.schemas.ItineraryItem.properties.estimatedBudgetMin).toEqual(
      expect.objectContaining({
        type: "integer",
        minimum: 0,
        nullable: true,
      })
    );
    expect(
      document.components.schemas.ItineraryItem.properties.estimatedBudgetMin.description
    ).toContain("Rough guidance only");
    expect(
      document.components.schemas.SaveItineraryItemRequest.properties.estimatedBudgetMax
    ).toEqual(
      expect.objectContaining({
        type: "integer",
        minimum: 0,
        nullable: true,
      })
    );
    expect(
      document.components.schemas.SaveItineraryItemRequest.properties.estimatedBudgetNote
        .description
    ).toContain("guidance only");
    expect(
      document.paths["/api/trips/{tripId}/itinerary"].put.requestBody.content[
        "application/json"
      ].example.days[0].items[0]
    ).toEqual(
      expect.objectContaining({
        estimatedBudgetMin: 0,
        estimatedBudgetMax: 25000,
        estimatedBudgetNote: expect.any(String),
      })
    );
    expect(
      document.paths["/api/trips/{tripId}/itinerary"].get.responses[200].content[
        "application/json"
      ].example.data.days[0].items[0].attraction
    ).toEqual(
      expect.objectContaining({
        tripDayOpeningHours: expect.arrayContaining([
          expect.objectContaining({
            open: expect.any(String),
            close: expect.any(String),
          }),
        ]),
        tripDayIsOpen: true,
      })
    );
    expect(
      document.paths["/api/trips/{tripId}/ai-generate"].post.responses[200].content[
        "application/json"
      ].example.data.days[0].items[0]
    ).toEqual(
      expect.objectContaining({
        estimatedBudgetMin: 0,
        estimatedBudgetMax: 25000,
        estimatedBudgetNote: expect.any(String),
      })
    );
    expect(document.components.schemas.CreateTripRequest.properties.budget.description).toContain(
      "both manual and ai_assisted trips"
    );
    expect(document.components.schemas.CreateTripRequest.properties.destinationId.description).toContain(
      "Only active destinations"
    );
    expect(document.components.schemas.Trip.properties.budget.description).toContain(
      "manual and ai_assisted trips"
    );
    expect(document.tags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining([
        "Auth",
        "Dashboard",
        "Trips",
        "AI Planning",
        "Itineraries",
        "Admin Attractions",
      ])
    );
    expect(document.components.schemas.DashboardHomeResponse.required).toEqual(
      expect.arrayContaining(["featured", "meta"])
    );
    expect(
      document.paths["/api/dashboard/home"].get.responses[200].content["application/json"]
        .example.data
    ).toEqual(
      expect.objectContaining({
        featured: expect.arrayContaining([
          expect.objectContaining({
            destination: expect.objectContaining({
              slug: expect.any(String),
            }),
          }),
        ]),
      })
    );
    expect(
      document.paths["/api/dashboard/search"].get.responses[200].content["application/json"]
        .schema.properties.meta
    ).toEqual(
      expect.objectContaining({
        $ref: "#/components/schemas/PaginationMeta",
      })
    );
    expect(document.tags.find((tag) => tag.name === "AI Planning")).toEqual(
      expect.objectContaining({
        description: "Authenticated AI itinerary preview endpoints.",
      })
    );
    expect(document.tags.find((tag) => tag.name === "Admin Attractions")).toEqual(
      expect.objectContaining({
        description:
          "Internal admin-only attraction enrichment and operational catalog endpoints. This feature may be disabled by environment.",
      })
    );
    expect(document.paths["/api/admin/attractions/enrichment-pending"].get.description).toContain(
      "ADMIN_ENRICHMENT_ENABLED"
    );
    expect(document.paths["/api/admin/attractions/enrichment-pending"].get.responses[429]).toBeDefined();
    expect(document.paths["/api/admin/attractions/enrichment-pending"].get.responses[503]).toBeDefined();
    expect(
      document.paths["/api/admin/attractions/backfill-photos"].post.requestBody.description
    ).toContain("missing or replaceable image values");
    expect(
      document.components.schemas.BatchAttractionPhotoBackfillSummary.properties.updatedCount
    ).toEqual(
      expect.objectContaining({
        type: "integer",
      })
    );
    expect(document.components.schemas.ErrorResponse.required).toEqual(
      expect.arrayContaining(["data"])
    );
    expect(document.components.schemas.SaveItineraryRequest.properties.days.maxItems).toBe(30);
    expect(document.components.schemas.AdminAttractionEnrichmentResult).toBeDefined();
    expect(document.paths["/api/users/me"].patch.description).toContain(
      "Email changes are excluded"
    );
  });

  test("serves the rendered database relations page", async () => {
    const response = await request(app).get("/docs/database-relations");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Stoury API ERD");
    expect(response.text).toContain("cdn.jsdelivr.net/npm/mermaid");
  });
});
