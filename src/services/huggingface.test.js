const {
  createHuggingFaceClient,
  parseRankingResponse,
} = require("./huggingface");

describe("huggingface client", () => {
  test("parses ranked attraction ids from object content and filters unknown ids", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  rankedAttractionIds: ["attr-2", "missing", "attr-1", "attr-2"],
                  explanation: "Food-friendly stops should come first.",
                }),
              },
            },
          ],
        };
      },
    });
    const client = createHuggingFaceClient({
      apiToken: "hf-token",
      chatEndpoint: "https://example.com/hf",
      model: "test-model",
      fetchImpl,
    });

    const result = await client.rankCandidates({
      trip: {
        tripId: "trip-1",
        destinationId: "dest-1",
        startDate: "2026-04-01",
        endDate: "2026-04-02",
      },
      preferences: [{ id: "pref-1", slug: "food", name: "Food" }],
      candidates: [
        { attractionId: "attr-1", name: "Temple Complex" },
        { attractionId: "attr-2", name: "Food Street" },
      ],
    });

    expect(result).toEqual({
      rankedAttractionIds: ["attr-2", "attr-1"],
      explanation: "Food-friendly stops should come first.",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/hf",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer hf-token",
        }),
      })
    );

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(false);
  });

  test("supports fenced JSON array fallback", () => {
    expect(
      parseRankingResponse('```json\n["attr-2","attr-1"]\n```', [
        "attr-1",
        "attr-2",
      ])
    ).toEqual({
      rankedAttractionIds: ["attr-2", "attr-1"],
      explanation: null,
    });
  });

  test("normalizes abort errors into AI_TIMEOUT", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
      })
    );
    const client = createHuggingFaceClient({
      apiToken: "hf-token",
      fetchImpl,
    });

    await expect(
      client.rankCandidates({
        trip: {
          tripId: "trip-1",
          destinationId: "dest-1",
          startDate: "2026-04-01",
          endDate: "2026-04-02",
        },
        preferences: [],
        candidates: [{ attractionId: "attr-1", name: "Temple Complex" }],
      })
    ).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      status: 504,
    });
  });
});
