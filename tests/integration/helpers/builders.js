const buildManualTripPayload = ({
  destinationId,
  title = "Bali Getaway",
  startDate = "2026-06-01",
  endDate = "2026-06-03",
  budget = 5000000,
  preferenceSource = "profile",
  preferenceCategoryIds = [],
} = {}) => ({
  title,
  destinationId,
  planningMode: "manual",
  startDate,
  endDate,
  budget,
  preferenceSource,
  preferenceCategoryIds,
});

const buildAiTripPayload = ({
  destinationId,
  title = "Yogya History Trip",
  startDate = "2026-07-10",
  endDate = "2026-07-12",
  budget = 3000000,
  preferenceSource = "custom",
  preferenceCategoryIds = [],
} = {}) => ({
  title,
  destinationId,
  planningMode: "ai_assisted",
  startDate,
  endDate,
  budget,
  preferenceSource,
  preferenceCategoryIds,
});

const buildPrimaryBaliItineraryPayload = (seedData) => ({
  days: [
    {
      dayNumber: 1,
      items: [
        {
          attractionId: seedData.attractions["tanah-lot"].id,
          orderIndex: 1,
          startTime: "09:00",
          endTime: "11:30",
        },
        {
          attractionId: seedData.attractions["sacred-monkey-forest-sanctuary"].id,
          orderIndex: 2,
          startTime: "13:00",
          endTime: "15:00",
        },
      ],
    },
    {
      dayNumber: 2,
      items: [
        {
          attractionId: seedData.attractions["tegalalang-rice-terrace"].id,
          orderIndex: 1,
          startTime: "09:00",
          endTime: "11:00",
        },
        {
          attractionId: seedData.attractions["seminyak-beach"].id,
          orderIndex: 2,
          startTime: "14:00",
          endTime: "17:00",
        },
      ],
    },
  ],
});

const buildAlternateBaliItineraryPayload = (seedData) => ({
  days: [
    {
      dayNumber: 1,
      items: [
        {
          attractionId: seedData.attractions["uluwatu-temple"].id,
          orderIndex: 1,
          startTime: "09:00",
          endTime: "11:30",
        },
        {
          attractionId: seedData.attractions["garuda-wisnu-kencana-cultural-park"].id,
          orderIndex: 2,
          startTime: "13:00",
          endTime: "16:00",
        },
      ],
    },
    {
      dayNumber: 2,
      items: [
        {
          attractionId: seedData.attractions["nusa-dua-beach"].id,
          orderIndex: 1,
          startTime: "09:30",
          endTime: "12:00",
        },
        {
          attractionId: seedData.attractions["jimbaran-bay"].id,
          orderIndex: 2,
          startTime: "17:00",
          endTime: "19:00",
        },
      ],
    },
  ],
});

module.exports = {
  buildAiTripPayload,
  buildAlternateBaliItineraryPayload,
  buildManualTripPayload,
  buildPrimaryBaliItineraryPayload,
};
