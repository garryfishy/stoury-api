describe("OpenAPI document", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_ACCESS_SECRET: originalEnv.JWT_ACCESS_SECRET || "test-access-secret",
      JWT_REFRESH_SECRET:
        originalEnv.JWT_REFRESH_SECRET || "test-refresh-secret",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("includes itinerary and AI planning paths and schemas", () => {
    const { buildOpenApiDocument } = require("./index");
    const document = buildOpenApiDocument();

    expect(document.paths["/api/trips/{tripId}/itinerary"]).toBeDefined();
    expect(document.paths["/api/trips/{tripId}/ai-generate"]).toBeDefined();
    expect(document.components.schemas.TripItinerary).toBeDefined();
    expect(document.components.schemas.AiPlanningPreview).toBeDefined();
    expect(document.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Itineraries" }),
        expect.objectContaining({ name: "AI Planning" }),
      ])
    );
  });
});
