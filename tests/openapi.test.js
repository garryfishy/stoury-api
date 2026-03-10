process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.OPENAPI_SERVER_URL =
  process.env.OPENAPI_SERVER_URL || "http://43.157.208.56:2000";

const request = require("supertest");
const app = require("../src/app");
const { buildOpenApiDocument } = require("../src/docs/openapi");

describe("OpenAPI document", () => {
  test("includes documented trip, itinerary, and AI planning paths", () => {
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
    expect(document.paths["/api/trips/{tripId}"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/itinerary"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/ai-generate"]).toBeDefined();
    expect(
      document.paths["/api/trips"].post.requestBody.content["application/json"].examples
    ).toEqual(
      expect.objectContaining({
        profilePreferences: expect.any(Object),
        customPreferences: expect.any(Object),
      })
    );
    expect(document.tags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining(["Auth", "Trips", "AI Planning", "Itineraries"])
    );
    expect(document.tags.find((tag) => tag.name === "AI Planning")).toEqual(
      expect.objectContaining({
        description: "Authenticated AI itinerary preview endpoints.",
      })
    );
    expect(document.components.schemas.ErrorResponse.required).toEqual(
      expect.arrayContaining(["data"])
    );
    expect(document.components.schemas.SaveItineraryRequest.properties.days.maxItems).toBe(30);
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
