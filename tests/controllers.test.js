jest.mock("../src/modules/auth/auth.service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock("../src/modules/users/users.service", () => ({
  usersService: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock("../src/modules/preferences/preferences.service", () => ({
  preferencesService: {
    getMyPreferences: jest.fn(),
    replaceMyPreferences: jest.fn(),
  },
}));

jest.mock("../src/modules/destinations/destinations.service", () => ({
  destinationsService: {
    listDestinations: jest.fn(),
    getDestination: jest.fn(),
  },
}));

jest.mock("../src/modules/attractions/attractions.service", () => ({
  attractionsService: {
    listByDestination: jest.fn(),
    getDetail: jest.fn(),
  },
}));

jest.mock("../src/modules/admin-attractions/admin-attractions.service", () => ({
  adminAttractionsService: {
    listPendingEnrichment: jest.fn(),
    enrichAttraction: jest.fn(),
    enrichMissing: jest.fn(),
  },
}));

jest.mock("../src/modules/trips/trips.service", () => ({
  tripsService: {
    createTrip: jest.fn(),
    listMyTrips: jest.fn(),
    getTripDetail: jest.fn(),
    updateTrip: jest.fn(),
  },
}));

jest.mock("../src/modules/itineraries/itineraries.service", () => ({
  itinerariesService: {
    getTripItinerary: jest.fn(),
    saveTripItinerary: jest.fn(),
  },
}));

jest.mock("../src/modules/ai-planning/ai-planning.service", () => ({
  aiPlanningService: {
    generatePreview: jest.fn(),
  },
}));

const { createMockNext, createMockResponse } = require("./helpers/http");
const { authService } = require("../src/modules/auth/auth.service");
const { usersService } = require("../src/modules/users/users.service");
const { preferencesService } = require("../src/modules/preferences/preferences.service");
const { destinationsService } = require("../src/modules/destinations/destinations.service");
const { attractionsService } = require("../src/modules/attractions/attractions.service");
const {
  adminAttractionsService,
} = require("../src/modules/admin-attractions/admin-attractions.service");
const { tripsService } = require("../src/modules/trips/trips.service");
const { itinerariesService } = require("../src/modules/itineraries/itineraries.service");
const { aiPlanningService } = require("../src/modules/ai-planning/ai-planning.service");
const {
  register,
  login,
  refresh,
  logout,
} = require("../src/modules/auth/auth.controller");
const { getMe, updateMe } = require("../src/modules/users/users.controller");
const {
  getMine,
  replaceMine,
} = require("../src/modules/preferences/preferences.controller");
const {
  listDestinations,
  getDestination,
} = require("../src/modules/destinations/destinations.controller");
const {
  listByDestination,
  getAttraction,
} = require("../src/modules/attractions/attractions.controller");
const {
  enrichAttraction,
  enrichMissingAttractions,
  listPendingEnrichment,
} = require("../src/modules/admin-attractions/admin-attractions.controller");
const {
  createTrip,
  listMyTrips,
  getTrip,
  updateTrip,
} = require("../src/modules/trips/trips.controller");
const {
  getTripItinerary,
  saveTripItinerary,
} = require("../src/modules/itineraries/itineraries.controller");
const {
  generateAiTripPreview,
} = require("../src/modules/ai-planning/ai-planning.controller");

describe("controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("auth controller", () => {
    test("register delegates to the service and returns 201", async () => {
      const req = {
        body: { name: "Ayu", email: "ayu@example.com", password: "securePass123" },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { accessToken: "access", refreshToken: "refresh" };
      authService.register.mockResolvedValue(payload);

      await register(req, res, next);

      expect(authService.register).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User registered.",
        data: payload,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("login forwards service failures to next", async () => {
      const req = {
        body: { email: "ayu@example.com", password: "wrong-password" },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error("boom");
      authService.login.mockRejectedValue(error);

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("refresh returns a success payload", async () => {
      const req = { body: { refreshToken: "refresh-token" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { accessToken: "next-access", refreshToken: "next-refresh" };
      authService.refresh.mockResolvedValue(payload);

      await refresh(req, res, next);

      expect(authService.refresh).toHaveBeenCalledWith("refresh-token");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Token refreshed.",
        data: payload,
      });
    });

    test("logout returns a null data payload", async () => {
      const req = { body: { refreshToken: "refresh-token" } };
      const res = createMockResponse();
      const next = createMockNext();
      authService.logout.mockResolvedValue(undefined);

      await logout(req, res, next);

      expect(authService.logout).toHaveBeenCalledWith("refresh-token");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Logout successful.",
        data: null,
      });
    });
  });

  describe("users controller", () => {
    test("getMe returns the authenticated user's profile", async () => {
      const req = { auth: { userId: "user-1" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "user-1", name: "Ayu", email: "ayu@example.com" };
      usersService.getProfile.mockResolvedValue(payload);

      await getMe(req, res, next);

      expect(usersService.getProfile).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Profile fetched.",
        data: payload,
      });
    });

    test("updateMe returns the updated profile", async () => {
      const req = { auth: { userId: "user-1" }, body: { name: "Ayu Pratama" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "user-1", name: "Ayu Pratama", email: "ayu@example.com" };
      usersService.updateProfile.mockResolvedValue(payload);

      await updateMe(req, res, next);

      expect(usersService.updateProfile).toHaveBeenCalledWith("user-1", { name: "Ayu Pratama" });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated.",
        data: payload,
      });
    });
  });

  describe("preferences controller", () => {
    test("getMine returns the current user's preferences", async () => {
      const req = { auth: { userId: "user-1" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = [{ id: "pref-1", slug: "food" }];
      preferencesService.getMyPreferences.mockResolvedValue(payload);

      await getMine(req, res, next);

      expect(preferencesService.getMyPreferences).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Preferences fetched.",
        data: payload,
      });
    });

    test("replaceMine replaces the current user's preference snapshot", async () => {
      const req = { auth: { userId: "user-1" }, body: { categoryIds: ["pref-1", "pref-2"] } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = [{ id: "pref-1" }, { id: "pref-2" }];
      preferencesService.replaceMyPreferences.mockResolvedValue(payload);

      await replaceMine(req, res, next);

      expect(preferencesService.replaceMyPreferences).toHaveBeenCalledWith("user-1", [
        "pref-1",
        "pref-2",
      ]);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Preferences updated.",
        data: payload,
      });
    });
  });

  describe("destinations controller", () => {
    test("listDestinations returns public destinations", async () => {
      const req = { query: { page: 2, limit: 1 } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = {
        items: [{ id: "dest-1", slug: "batam" }],
        pagination: { page: 2, limit: 1, total: 3, totalPages: 3 },
      };
      destinationsService.listDestinations.mockResolvedValue(payload);

      await listDestinations(req, res, next);

      expect(destinationsService.listDestinations).toHaveBeenCalledWith(req.query);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Destinations fetched.",
        data: payload.items,
        meta: payload.pagination,
      });
    });

    test("getDestination returns one destination", async () => {
      const req = { params: { idOrSlug: "batam" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "dest-1", slug: "batam" };
      destinationsService.getDestination.mockResolvedValue(payload);

      await getDestination(req, res, next);

      expect(destinationsService.getDestination).toHaveBeenCalledWith("batam");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Destination fetched.",
        data: payload,
      });
    });
  });

  describe("attractions controller", () => {
    test("listByDestination returns filtered attractions", async () => {
      const req = {
        params: { destinationId: "dest-1" },
        query: { categoryIds: ["cat-1"], page: 2, limit: 1 },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = {
        destination: { id: "dest-1" },
        items: [{ id: "attr-1" }],
        pagination: { page: 2, limit: 1, total: 4, totalPages: 4 },
      };
      attractionsService.listByDestination.mockResolvedValue(payload);

      await listByDestination(req, res, next);

      expect(attractionsService.listByDestination).toHaveBeenCalledWith("dest-1", req.query);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Attractions fetched.",
        data: {
          destination: payload.destination,
          items: payload.items,
        },
        meta: payload.pagination,
      });
    });

    test("getAttraction returns one attraction", async () => {
      const req = { params: { idOrSlug: "pantai-nongsa" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "attr-1", slug: "pantai-nongsa" };
      attractionsService.getDetail.mockResolvedValue(payload);

      await getAttraction(req, res, next);

      expect(attractionsService.getDetail).toHaveBeenCalledWith("pantai-nongsa");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Attraction fetched.",
        data: payload,
      });
    });
  });

  describe("admin attractions controller", () => {
    test("listPendingEnrichment returns the admin enrichment list payload", async () => {
      const req = {
        query: { status: "pending", limit: 10 },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { items: [{ id: "attr-1" }], total: 1 };
      adminAttractionsService.listPendingEnrichment.mockResolvedValue(payload);

      await listPendingEnrichment(req, res, next);

      expect(adminAttractionsService.listPendingEnrichment).toHaveBeenCalledWith(req.query);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Pending attraction enrichment fetched.",
        data: payload,
      });
    });

    test("enrichAttraction returns the enrichment result", async () => {
      const req = {
        params: { attractionId: "attr-1" },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { outcome: "enriched" };
      adminAttractionsService.enrichAttraction.mockResolvedValue(payload);

      await enrichAttraction(req, res, next);

      expect(adminAttractionsService.enrichAttraction).toHaveBeenCalledWith("attr-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Attraction enrichment processed.",
        data: payload,
      });
    });

    test("enrichMissingAttractions returns the batch summary", async () => {
      const req = {
        body: { dryRun: true, limit: 3 },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { dryRun: true, attemptedCount: 3 };
      adminAttractionsService.enrichMissing.mockResolvedValue(payload);

      await enrichMissingAttractions(req, res, next);

      expect(adminAttractionsService.enrichMissing).toHaveBeenCalledWith(req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Attraction batch enrichment processed.",
        data: payload,
      });
    });
  });

  describe("trips controller", () => {
    test("createTrip returns a 201 response", async () => {
      const req = {
        auth: { userId: "user-1" },
        body: { title: "Trip" },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "trip-1" };
      tripsService.createTrip.mockResolvedValue(payload);

      await createTrip(req, res, next);

      expect(tripsService.createTrip).toHaveBeenCalledWith("user-1", req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Trip created.",
        data: payload,
      });
    });

    test("listMyTrips returns the current user's trips", async () => {
      const req = { auth: { userId: "user-1" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = [{ id: "trip-1" }];
      tripsService.listMyTrips.mockResolvedValue(payload);

      await listMyTrips(req, res, next);

      expect(tripsService.listMyTrips).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Trips fetched.",
        data: payload,
      });
    });

    test("getTrip returns one owned trip", async () => {
      const req = { auth: { userId: "user-1" }, params: { tripId: "trip-1" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "trip-1" };
      tripsService.getTripDetail.mockResolvedValue(payload);

      await getTrip(req, res, next);

      expect(tripsService.getTripDetail).toHaveBeenCalledWith("user-1", "trip-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Trip fetched.",
        data: payload,
      });
    });

    test("updateTrip returns the updated trip", async () => {
      const req = {
        auth: { userId: "user-1" },
        params: { tripId: "trip-1" },
        body: { title: "Updated trip" },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { id: "trip-1", title: "Updated trip" };
      tripsService.updateTrip.mockResolvedValue(payload);

      await updateTrip(req, res, next);

      expect(tripsService.updateTrip).toHaveBeenCalledWith("user-1", "trip-1", {
        title: "Updated trip",
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Trip updated.",
        data: payload,
      });
    });
  });

  describe("itineraries controller", () => {
    test("getTripItinerary returns the itinerary payload", async () => {
      const req = { auth: { userId: "user-1" }, params: { tripId: "trip-1" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { itineraryId: "itinerary-1", days: [] };
      itinerariesService.getTripItinerary.mockResolvedValue(payload);

      await getTripItinerary(req, res, next);

      expect(itinerariesService.getTripItinerary).toHaveBeenCalledWith("user-1", "trip-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Trip itinerary fetched.",
        data: payload,
      });
    });

    test("saveTripItinerary returns the saved itinerary payload", async () => {
      const req = {
        auth: { userId: "user-1" },
        params: { tripId: "trip-1" },
        body: { days: [] },
      };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { itineraryId: "itinerary-1", days: [] };
      itinerariesService.saveTripItinerary.mockResolvedValue(payload);

      await saveTripItinerary(req, res, next);

      expect(itinerariesService.saveTripItinerary).toHaveBeenCalledWith("user-1", "trip-1", {
        days: [],
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Trip itinerary saved.",
        data: payload,
      });
    });
  });

  describe("ai-planning controller", () => {
    test("generateAiTripPreview returns the preview payload", async () => {
      const req = { auth: { userId: "user-1" }, params: { tripId: "trip-1" } };
      const res = createMockResponse();
      const next = createMockNext();
      const payload = { tripId: "trip-1", days: [] };
      aiPlanningService.generatePreview.mockResolvedValue(payload);

      await generateAiTripPreview(req, res, next);

      expect(aiPlanningService.generatePreview).toHaveBeenCalledWith("user-1", "trip-1");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "AI itinerary preview generated.",
        data: payload,
      });
    });
  });
});
