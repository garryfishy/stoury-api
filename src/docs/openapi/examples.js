const ids = {
  userId: "11111111-1111-4111-8111-111111111111",
  destinationId: "22222222-2222-4222-8222-222222222222",
  attractionId: "33333333-3333-4333-8333-333333333333",
  tripId: "44444444-4444-4444-8444-444444444444",
  preferenceFoodId: "55555555-5555-4555-8555-555555555555",
  preferenceCultureId: "66666666-6666-4666-8666-666666666666",
  attractionCategoryNatureId: "77777777-7777-4777-8777-777777777777",
  itineraryId: "88888888-8888-4888-8888-888888888888",
  itineraryDayId: "99999999-9999-4999-8999-999999999999",
  itineraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  secondAttractionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  thirdAttractionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  googlePlaceId: "ChIJabc123examplePlace",
  googleAltPlaceId: "ChIJalt456examplePlace",
};

const user = {
  id: ids.userId,
  name: "Ayu Pratama",
  email: "ayu@example.com",
  roles: ["user"],
};

const preferences = [
  {
    id: ids.preferenceFoodId,
    name: "Food",
    slug: "food",
    description: "Culinary experiences and local specialties.",
  },
  {
    id: ids.preferenceCultureId,
    name: "Culture",
    slug: "culture",
    description: "Museums, heritage sites, and cultural activities.",
  },
];

const destination = {
  id: ids.destinationId,
  name: "Batam",
  slug: "batam",
  isActive: true,
  description: "Weekend-friendly island city with food, shopping, and seaside escapes.",
  destinationType: "city",
  countryCode: "ID",
  countryName: "Indonesia",
  provinceName: "Riau Islands",
  cityName: "Batam",
  regionName: null,
  heroImageUrl: "https://images.example.com/destinations/batam-hero.jpg",
  metadata: {},
};

const attractionCategory = {
  id: ids.attractionCategoryNatureId,
  name: "Nature",
  slug: "nature",
};

const attraction = {
  id: ids.attractionId,
  destinationId: ids.destinationId,
  name: "Pantai Nongsa",
  slug: "pantai-nongsa",
  description: "A beach destination known for resorts and sea views.",
  fullAddress: "Nongsa, Batam, Kepulauan Riau, Indonesia",
  latitude: "1.1870000",
  longitude: "104.1190000",
  estimatedDurationMinutes: 120,
  openingHours: {
    monday: ["08:00-18:00"],
    tuesday: ["08:00-18:00"],
  },
  rating: "4.5",
  thumbnailImageUrl: "https://images.example.com/attractions/pantai-nongsa-thumb.jpg",
  mainImageUrl: "https://images.example.com/attractions/pantai-nongsa-main.jpg",
  metadata: {},
  enrichment: {
    externalSource: null,
    externalPlaceId: null,
    externalRating: null,
    externalReviewCount: null,
    externalLastSyncedAt: null,
  },
  destination,
  categories: [attractionCategory],
};

const itineraryAttractionSummary = {
  id: attraction.id,
  destinationId: attraction.destinationId,
  name: attraction.name,
  slug: attraction.slug,
  fullAddress: attraction.fullAddress,
  latitude: attraction.latitude,
  longitude: attraction.longitude,
  estimatedDurationMinutes: attraction.estimatedDurationMinutes,
  rating: attraction.rating,
  thumbnailImageUrl: attraction.thumbnailImageUrl,
  mainImageUrl: attraction.mainImageUrl,
  enrichment: {
    externalSource: attraction.enrichment.externalSource,
    externalPlaceId: attraction.enrichment.externalPlaceId,
  },
  categories: attraction.categories,
};

const secondItineraryAttractionSummary = {
  id: ids.secondAttractionId,
  destinationId: ids.destinationId,
  name: "Barelang Bridge",
  slug: "barelang-bridge",
  fullAddress: "Barelang, Batam, Kepulauan Riau, Indonesia",
  latitude: "1.0202000",
  longitude: "103.9859000",
  estimatedDurationMinutes: 90,
  rating: "4.6",
  thumbnailImageUrl: "https://images.example.com/attractions/barelang-thumb.jpg",
  mainImageUrl: "https://images.example.com/attractions/barelang-main.jpg",
  enrichment: {
    externalSource: null,
    externalPlaceId: null,
  },
  categories: [attractionCategory],
};

const thirdItineraryAttractionSummary = {
  id: ids.thirdAttractionId,
  destinationId: ids.destinationId,
  name: "Mega Wisata Ocarina",
  slug: "mega-wisata-ocarina",
  fullAddress: "Sadai, Bengkong, Batam, Kepulauan Riau, Indonesia",
  latitude: "1.1565000",
  longitude: "104.0443000",
  estimatedDurationMinutes: 120,
  rating: "4.4",
  thumbnailImageUrl: "https://images.example.com/attractions/ocarina-thumb.jpg",
  mainImageUrl: "https://images.example.com/attractions/ocarina-main.jpg",
  enrichment: {
    externalSource: null,
    externalPlaceId: null,
  },
  categories: [attractionCategory],
};

const trip = {
  id: ids.tripId,
  title: "Batam long weekend",
  userId: ids.userId,
  destinationId: ids.destinationId,
  planningMode: "manual",
  startDate: "2026-04-10",
  endDate: "2026-04-12",
  durationDays: 3,
  budget: "2500000.00",
  destination,
  preferences,
  hasItinerary: false,
};

const tripSummary = {
  id: ids.tripId,
  title: "Batam long weekend",
  userId: ids.userId,
  destinationId: ids.destinationId,
  planningMode: "manual",
  startDate: "2026-04-10",
  endDate: "2026-04-12",
  durationDays: 3,
  budget: "2500000.00",
  destination,
  hasItinerary: false,
};

const tripItinerary = {
  itineraryId: ids.itineraryId,
  tripId: ids.tripId,
  destinationId: ids.destinationId,
  planningMode: "manual",
  startDate: trip.startDate,
  endDate: trip.endDate,
  hasItinerary: true,
  days: [
    {
      id: ids.itineraryDayId,
      dayNumber: 1,
      date: "2026-04-10",
      notes: null,
      items: [
        {
          id: ids.itineraryItemId,
          attractionId: attraction.id,
          attractionName: attraction.name,
          startTime: "09:00",
          endTime: "11:00",
          orderIndex: 1,
          notes: null,
          source: "manual",
          attraction: itineraryAttractionSummary,
        },
      ],
    },
  ],
};

const saveItineraryRequest = {
  days: [
    {
      dayNumber: 1,
      date: "2026-04-10",
      items: [
        {
          attractionId: attraction.id,
          orderIndex: 1,
          startTime: "09:00",
          endTime: "11:00",
          source: "manual",
        },
      ],
    },
    {
      dayNumber: 2,
      date: "2026-04-11",
      items: [
        {
          attractionId: ids.secondAttractionId,
          orderIndex: 1,
          startTime: "10:00",
          endTime: "11:30",
          source: "manual",
        },
      ],
    },
  ],
};

const aiPlanningPreview = {
  tripId: ids.tripId,
  destinationId: ids.destinationId,
  planningMode: "ai_assisted",
  startDate: trip.startDate,
  endDate: trip.endDate,
  generatedAt: "2026-03-10T12:00:00.000Z",
  preferences,
  strategy: {
    mode: "deterministic_only",
    provider: "deterministic",
    usedProviderRanking: false,
    reasoning:
      "MVP generation uses deterministic scheduling over curated DB attractions. Providers may rerank known candidates later but cannot introduce new attractions.",
  },
  budget: "2500000.00",
  budgetFit: {
    level: "balanced",
    perDayBudget: 833333.33,
    isApproximate: true,
    reasoning:
      "Budget averages about 833,333 per day across 3 day(s), which is a workable planning signal for the current curated itinerary style.",
  },
  budgetWarnings: [
    "Budget fit is approximate because attraction-level pricing, transport, food, and lodging costs are not stored in the current catalog yet.",
  ],
  isPartial: true,
  coverage: {
    requestedDayCount: 3,
    generatedDayCount: 3,
    availableAttractionCount: 3,
    requestedItemSlots: 12,
    scheduledItemCount: 3,
    maxItemsPerDay: 4,
  },
  warnings: [
    "Only 3 curated attractions were available for 12 recommended itinerary slots (3 day(s) x 4 items/day). The preview includes partial days where needed.",
    "Budget fit is approximate because attraction-level pricing, transport, food, and lodging costs are not stored in the current catalog yet.",
  ],
  days: [
    {
      dayNumber: 1,
      date: "2026-04-10",
      notes: null,
      isPartial: true,
      items: [
        {
          attractionId: attraction.id,
          attractionName: attraction.name,
          startTime: "09:00",
          endTime: "11:00",
          orderIndex: 1,
          notes: null,
          source: "ai_assisted",
          attraction: itineraryAttractionSummary,
        },
      ],
    },
    {
      dayNumber: 2,
      date: "2026-04-11",
      notes: null,
      isPartial: true,
      items: [
        {
          attractionId: ids.secondAttractionId,
          attractionName: secondItineraryAttractionSummary.name,
          startTime: "09:30",
          endTime: "11:00",
          orderIndex: 1,
          notes: null,
          source: "ai_assisted",
          attraction: secondItineraryAttractionSummary,
        },
      ],
    },
    {
      dayNumber: 3,
      date: "2026-04-12",
      notes: null,
      isPartial: true,
      items: [
        {
          attractionId: ids.thirdAttractionId,
          attractionName: thirdItineraryAttractionSummary.name,
          startTime: "10:00",
          endTime: "12:00",
          orderIndex: 1,
          notes: null,
          source: "ai_assisted",
          attraction: thirdItineraryAttractionSummary,
        },
      ],
    },
  ],
};

const adminPendingAttraction = {
  id: ids.attractionId,
  name: attraction.name,
  slug: attraction.slug,
  coordinates: {
    latitude: 1.187,
    longitude: 104.119,
  },
  destination,
  enrichment: {
    status: "pending",
    error: null,
    attemptedAt: null,
    externalSource: null,
    externalPlaceId: null,
    externalRating: null,
    externalReviewCount: null,
    externalLastSyncedAt: null,
  },
};

const adminGooglePlaceCandidate = {
  placeId: ids.googlePlaceId,
  name: "Pantai Nongsa",
  formattedAddress: "Nongsa, Batam City, Riau Islands, Indonesia",
  location: {
    latitude: 1.1868,
    longitude: 104.1194,
  },
  rating: 4.4,
  userRatingsTotal: 2874,
  types: ["tourist_attraction", "point_of_interest"],
  url: "https://maps.google.com/?cid=1234567890",
  websiteUri: null,
  distanceMeters: 52,
  exactNameMatch: true,
  partialNameMatch: true,
  score: 104,
};

const adminGoogleAltCandidate = {
  placeId: ids.googleAltPlaceId,
  name: "Nongsa Beach Club",
  formattedAddress: "Nongsa, Batam City, Riau Islands, Indonesia",
  location: {
    latitude: 1.193,
    longitude: 104.125,
  },
  rating: 4.1,
  userRatingsTotal: 912,
  types: ["lodging", "tourist_attraction"],
  url: null,
  websiteUri: null,
  distanceMeters: 843,
  exactNameMatch: false,
  partialNameMatch: true,
  score: 58,
};

const adminEnrichmentSuccessResult = {
  attraction: {
    ...adminPendingAttraction,
    enrichment: {
      status: "enriched",
      error: null,
      attemptedAt: "2026-03-10T08:30:00.000Z",
      externalSource: "google_places",
      externalPlaceId: ids.googlePlaceId,
      externalRating: 4.4,
      externalReviewCount: 2874,
      externalLastSyncedAt: "2026-03-10T08:30:00.000Z",
    },
  },
  outcome: "enriched",
  query: "Pantai Nongsa, Batam, Indonesia",
  candidateCount: 1,
  candidates: [adminGooglePlaceCandidate],
  selectedPlace: {
    ...adminGooglePlaceCandidate,
    distanceMeters: undefined,
    exactNameMatch: undefined,
    partialNameMatch: undefined,
    score: undefined,
  },
  error: null,
  reason: null,
};

const adminEnrichmentNeedsReviewResult = {
  attraction: {
    ...adminPendingAttraction,
    enrichment: {
      ...adminPendingAttraction.enrichment,
      status: "needs_review",
      attemptedAt: "2026-03-10T08:31:00.000Z",
    },
  },
  outcome: "needs_review",
  query: "Pantai Nongsa, Batam, Indonesia",
  candidateCount: 2,
  candidates: [adminGooglePlaceCandidate, adminGoogleAltCandidate],
  selectedPlace: null,
  error: null,
  reason: "Google Places returned multiple plausible matches. Manual review is required.",
};

const adminEnrichmentFailedResult = {
  attraction: {
    ...adminPendingAttraction,
    enrichment: {
      ...adminPendingAttraction.enrichment,
      status: "failed",
      error: "Google Places text search timed out.",
      attemptedAt: "2026-03-10T08:32:00.000Z",
    },
  },
  outcome: "failed",
  query: "Pantai Nongsa, Batam, Indonesia",
  candidateCount: 0,
  candidates: [],
  selectedPlace: null,
  error: "Google Places text search timed out.",
  reason: "Google Places text search timed out.",
};

const adminEnrichmentPendingCollection = {
  items: [adminPendingAttraction],
  total: 1,
  filtersApplied: {
    destinationId: ids.destinationId,
    status: "pending",
    limit: 25,
    staleOnly: false,
    staleDays: 30,
  },
};

const adminBatchEnrichmentSummary = {
  dryRun: true,
  attemptedCount: 3,
  enrichedCount: 1,
  needsReviewCount: 1,
  failedCount: 1,
  results: [
    adminEnrichmentSuccessResult,
    adminEnrichmentNeedsReviewResult,
    adminEnrichmentFailedResult,
  ],
};

module.exports = {
  attraction,
  attractionCategory,
  adminBatchEnrichmentSummary,
  adminEnrichmentFailedResult,
  adminEnrichmentNeedsReviewResult,
  adminEnrichmentPendingCollection,
  adminEnrichmentSuccessResult,
  aiPlanningPreview,
  destination,
  ids,
  itineraryAttractionSummary,
  preferences,
  saveItineraryRequest,
  trip,
  tripItinerary,
  tripSummary,
  user,
};
