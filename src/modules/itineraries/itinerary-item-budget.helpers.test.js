const {
  estimateItineraryItemBudget,
} = require("./itinerary-item-budget.helpers");

describe("estimateItineraryItemBudget", () => {
  test("returns a deterministic range for known attraction categories", () => {
    const result = estimateItineraryItemBudget({
      attraction: {
        estimatedDurationMinutes: 120,
      },
      categories: [
        {
          slug: "temple",
        },
      ],
    });

    expect(result).toEqual({
      estimatedBudgetMin: 0,
      estimatedBudgetMax: 60000,
      estimatedBudgetNote:
        "Heuristic only: allows for common entry, donation, or parking-style spend.",
    });
  });

  test("returns null estimates when the heuristic has no category signal", () => {
    const result = estimateItineraryItemBudget({
      attraction: {
        estimatedDurationMinutes: 120,
      },
      categories: [
        {
          slug: "unknown-category",
        },
      ],
    });

    expect(result).toEqual({
      estimatedBudgetMin: null,
      estimatedBudgetMax: null,
      estimatedBudgetNote: null,
    });
  });
});
