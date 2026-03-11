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
    expect(document.paths["/api/dashboard/home"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/itinerary"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/ai-generate"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/enrichment-pending"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/{attractionId}/enrich"]).toBeDefined();
    expect(document.paths["/api/admin/attractions/enrich-missing"]).toBeDefined();
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
    expect(document.paths["/api/dashboard/home"].get.description).toContain(
      "Batam-first"
    );
    expect(document.components.schemas.DashboardHomeCard.properties.badge.enum).toEqual(
      expect.arrayContaining(["popular", "food", "shopping", "history"])
    );
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
