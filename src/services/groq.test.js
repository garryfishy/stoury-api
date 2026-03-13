const { createGroqClient } = require("./groq");

describe("groq client", () => {
  test("posts a structured-output ranking request and parses the response", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  rankedAttractionIds: ["attr-2", "attr-1"],
                  explanation: "Food-first ordering.",
                }),
              },
            },
          ],
        };
      },
    });
    const client = createGroqClient({
      apiKey: "groq-key",
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
        {
          attractionId: "attr-1",
          name: "Temple Complex",
          bestVisitTime: "morning",
          openingHoursHint: {
            opensAt: "08:00",
            closesAt: "18:00",
          },
          fullAddress: "Nagoya, Batam, Kepulauan Riau, Indonesia",
          latitude: "1.1450",
          longitude: "104.0100",
        },
        {
          attractionId: "attr-2",
          name: "Food Street",
          bestVisitTime: "evening",
          openingHoursHint: {
            opensAt: "10:00",
            closesAt: "22:00",
          },
          fullAddress: "Harbour Bay, Batam, Kepulauan Riau, Indonesia",
          latitude: "1.1550",
          longitude: "103.9900",
        },
      ],
    });

    expect(result).toEqual({
      rankedAttractionIds: ["attr-2", "attr-1"],
      explanation: "Food-first ordering.",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer groq-key",
        }),
      })
    );

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.model).toBe("llama-3.1-8b-instant");
    expect(body.response_format).toEqual(
      expect.objectContaining({
        type: "json_object",
      })
    );
    expect(body.messages[0].content).toContain("geographically coherent same-day clusters");
    expect(body.messages[0].content).toContain("morning-friendly heritage or temple stops before sunset or evening venues");
    expect(body.messages[1].content).toContain('"bestVisitTime":"morning"');
    expect(body.messages[1].content).toContain('"openingHoursHint":{"opensAt":"08:00","closesAt":"18:00"}');
    expect(body.messages[1].content).toContain("Treat bestVisitTime and openingHoursHint as strong timing hints.");
    expect(body.messages[1].content).toContain('"location":{"latitude":1.145');
    expect(body.messages[1].content).toContain('"longitude":103.99');
  });

  test("normalizes abort errors into AI_TIMEOUT", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
      })
    );
    const client = createGroqClient({
      apiKey: "groq-key",
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
