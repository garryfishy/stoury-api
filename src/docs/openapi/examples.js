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
  estimatedDurationMinutes: attraction.estimatedDurationMinutes,
  rating: attraction.rating,
  thumbnailImageUrl: attraction.thumbnailImageUrl,
  mainImageUrl: attraction.mainImageUrl,
  categories: attraction.categories,
};

const secondItineraryAttractionSummary = {
  id: ids.secondAttractionId,
  destinationId: ids.destinationId,
  name: "Barelang Bridge",
  slug: "barelang-bridge",
  estimatedDurationMinutes: 90,
  rating: "4.6",
  thumbnailImageUrl: "https://images.example.com/attractions/barelang-thumb.jpg",
  mainImageUrl: "https://images.example.com/attractions/barelang-main.jpg",
  categories: [attractionCategory],
};

const thirdItineraryAttractionSummary = {
  id: ids.thirdAttractionId,
  destinationId: ids.destinationId,
  name: "Mega Wisata Ocarina",
  slug: "mega-wisata-ocarina",
  estimatedDurationMinutes: 120,
  rating: "4.4",
  thumbnailImageUrl: "https://images.example.com/attractions/ocarina-thumb.jpg",
  mainImageUrl: "https://images.example.com/attractions/ocarina-main.jpg",
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
  warnings: [],
  days: [
    {
      dayNumber: 1,
      date: "2026-04-10",
      notes: null,
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
        {
          attractionId: ids.secondAttractionId,
          attractionName: secondItineraryAttractionSummary.name,
          startTime: "11:30",
          endTime: "13:00",
          orderIndex: 2,
          notes: null,
          source: "ai_assisted",
          attraction: secondItineraryAttractionSummary,
        },
      ],
    },
    {
      dayNumber: 2,
      date: "2026-04-11",
      notes: null,
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

module.exports = {
  attraction,
  attractionCategory,
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
