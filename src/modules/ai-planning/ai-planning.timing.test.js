const {
  getCandidateBestVisitTime,
  getCandidateOpeningHoursHint,
  getCandidateVisitTimeProfile,
  getVisitTimePenalty,
} = require("./ai-planning.timing");

const createCandidate = ({
  name,
  slug,
  categorySlugs = [],
  metadata = {},
  providerBestVisitTime,
  openingHours,
}) => ({
  providerBestVisitTime,
  categorySlugs,
  attraction: {
    name,
    slug,
    metadata,
    openingHours,
  },
});

describe("ai planning timing helpers", () => {
  test("prefers provider time hints over catalog metadata and fallback heuristics", () => {
    const candidate = createCandidate({
      name: "Obelix Hills",
      slug: "obelix-hills",
      categorySlugs: ["viewpoint", "culinary"],
      metadata: { best_time: "sunset" },
      providerBestVisitTime: "evening",
    });

    expect(getCandidateBestVisitTime(candidate)).toBe("evening");
  });

  test("shifts sunset culinary viewpoints later than sunset heritage stops", () => {
    const eveningViewProfile = getCandidateVisitTimeProfile(
      createCandidate({
        name: "HeHa Sky View",
        slug: "heha-sky-view",
        categorySlugs: ["viewpoint", "culinary"],
        metadata: { best_time: "sunset" },
      })
    );
    const heritageSunsetProfile = getCandidateVisitTimeProfile(
      createCandidate({
        name: "Candi Ijo",
        slug: "candi-ijo",
        categorySlugs: ["temple", "viewpoint"],
        metadata: { best_time: "sunset" },
      })
    );

    expect(eveningViewProfile.preferredStartMinutes).toBeGreaterThan(
      heritageSunsetProfile.preferredStartMinutes
    );
    expect(eveningViewProfile.latestDayEndMinutes).toBeGreaterThan(
      heritageSunsetProfile.latestDayEndMinutes
    );
  });

  test("summarizes opening-hours hints for provider prompts", () => {
    expect(
      getCandidateOpeningHoursHint(
        createCandidate({
          name: "Obelix Hills",
          slug: "obelix-hills",
          categorySlugs: ["viewpoint", "culinary"],
          metadata: { best_time: "sunset" },
          openingHours: {
            monday: [{ open: "10:00", close: "22:00" }],
            tuesday: [{ open: "10:00", close: "22:00" }],
          },
        })
      )
    ).toEqual({
      opensAt: "10:00",
      closesAt: "22:00",
    });
  });

  test("heavily penalizes scheduling a sunset attraction in the morning", () => {
    const candidate = createCandidate({
      name: "Obelix Hills",
      slug: "obelix-hills",
      categorySlugs: ["viewpoint", "culinary"],
      metadata: { best_time: "sunset" },
    });

    expect(
      getVisitTimePenalty({
        candidate,
        startMinutes: 10 * 60,
      })
    ).toBeGreaterThan(
      getVisitTimePenalty({
        candidate,
        startMinutes: 18 * 60,
      })
    );
  });
});
