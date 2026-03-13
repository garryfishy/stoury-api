const {
  calculateCandidateDistanceKm,
  estimateAdditionalTransferMinutes,
  findBestCandidateForDay,
} = require("./ai-planning.locality");

const alwaysOpen = {
  monday: [{ open: "08:00", close: "18:00" }],
  tuesday: [{ open: "08:00", close: "18:00" }],
  wednesday: [{ open: "08:00", close: "18:00" }],
  thursday: [{ open: "08:00", close: "18:00" }],
  friday: [{ open: "08:00", close: "18:00" }],
  saturday: [{ open: "08:00", close: "18:00" }],
  sunday: [{ open: "08:00", close: "18:00" }],
};

const createCandidate = ({
  attractionId,
  latitude,
  longitude,
  durationMinutes = 90,
}) => ({
  attractionId,
  durationMinutes,
  attraction: {
    id: attractionId,
    latitude,
    longitude,
    openingHours: alwaysOpen,
  },
});

describe("ai planning locality helpers", () => {
  test("calculates a geographic distance when both attractions have coordinates", () => {
    const distanceKm = calculateCandidateDistanceKm(
      createCandidate({
        attractionId: "anchor",
        latitude: "1.1300",
        longitude: "104.0200",
      }),
      createCandidate({
        attractionId: "nearby",
        latitude: "1.1350",
        longitude: "104.0250",
      })
    );

    expect(distanceKm).toBeGreaterThan(0);
    expect(distanceKm).toBeLessThan(2);
  });

  test("estimates extra transfer time only when the hop is materially longer than the default buffer", () => {
    const additionalMinutes = estimateAdditionalTransferMinutes({
      fromCandidate: createCandidate({
        attractionId: "anchor",
        latitude: "1.1300",
        longitude: "104.0200",
      }),
      toCandidate: createCandidate({
        attractionId: "far-hop",
        latitude: "1.4300",
        longitude: "104.4200",
      }),
    });

    expect(additionalMinutes).toBeGreaterThan(0);
  });

  test("prefers a nearby feasible stop over a far one once the day has started", () => {
    const dayAnchorCandidate = createCandidate({
      attractionId: "anchor",
      latitude: "1.1300",
      longitude: "104.0200",
    });
    const selection = findBestCandidateForDay({
      remainingCandidates: [
        createCandidate({
          attractionId: "far-ranked-second",
          latitude: "1.4300",
          longitude: "104.4200",
        }),
        createCandidate({
          attractionId: "near-ranked-third",
          latitude: "1.1360",
          longitude: "104.0260",
        }),
      ],
      dateOnly: "2026-04-01",
      desiredStartMinutes: 12 * 60,
      previousCandidate: dayAnchorCandidate,
      dayAnchorCandidate,
    });

    expect(selection).toEqual(
      expect.objectContaining({
        selectedIndex: 1,
      })
    );
  });
});
