process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { createAiPlanningProvider } = require("./ai-planning.factory");

describe("createAiPlanningProvider", () => {
  test("returns deterministic provider by default", () => {
    const provider = createAiPlanningProvider({
      envConfig: {
        AI_PLANNING_PROVIDER: "deterministic",
      },
    });

    expect(provider.name).toBe("deterministic");
  });

  test("falls back to deterministic provider when Hugging Face token is missing", () => {
    const loggerInstance = {
      warn: jest.fn(),
    };
    const provider = createAiPlanningProvider({
      envConfig: {
        AI_PLANNING_PROVIDER: "hugging-face",
      },
      loggerInstance,
    });

    expect(provider.name).toBe("deterministic");
    expect(loggerInstance.warn).toHaveBeenCalledWith(
      expect.stringContaining("HF_API_TOKEN"),
      expect.objectContaining({
        provider: "hugging-face",
      })
    );
  });

  test("returns a Hugging Face provider when config is present", async () => {
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
    const provider = createAiPlanningProvider({
      envConfig: {
        AI_PLANNING_PROVIDER: "hugging-face",
        HF_API_TOKEN: "hf-token",
        HF_MODEL_ID: "test-model",
        HF_CHAT_ENDPOINT: "https://example.com/hf",
        HF_TIMEOUT_MS: 1000,
        HF_MAX_CANDIDATES: 10,
        HF_ENABLE_EXPLANATION: true,
        HF_TEMPERATURE: 0,
        HF_TOP_P: 1,
      },
      fetchImpl,
      loggerInstance: {
        warn: jest.fn(),
      },
    });

    expect(provider.name).toBe("hugging-face");

    const result = await provider.rankCandidates({
      trip: {
        tripId: "trip-1",
        destinationId: "dest-1",
        startDate: "2026-04-01",
        endDate: "2026-04-02",
      },
      preferences: [],
      candidates: [
        { attractionId: "attr-1", name: "Temple Complex" },
        { attractionId: "attr-2", name: "Food Street" },
      ],
    });

    expect(result).toEqual({
      rankedAttractionIds: ["attr-2", "attr-1"],
      explanation: "Food-first ordering.",
    });
  });

  test("returns a Groq provider when config is present", async () => {
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
    const provider = createAiPlanningProvider({
      envConfig: {
        AI_PLANNING_PROVIDER: "groq",
        GROQ_API_KEY: "groq-key",
        GROQ_MODEL: "llama-3.1-8b-instant",
        GROQ_CHAT_ENDPOINT: "https://api.groq.com/openai/v1/chat/completions",
        GROQ_TIMEOUT_MS: 1000,
        GROQ_MAX_CANDIDATES: 10,
        GROQ_ENABLE_EXPLANATION: true,
        GROQ_TEMPERATURE: 0,
        GROQ_TOP_P: 1,
      },
      fetchImpl,
      loggerInstance: {
        warn: jest.fn(),
      },
    });

    expect(provider.name).toBe("groq");

    const result = await provider.rankCandidates({
      trip: {
        tripId: "trip-1",
        destinationId: "dest-1",
        startDate: "2026-04-01",
        endDate: "2026-04-02",
      },
      preferences: [],
      candidates: [
        { attractionId: "attr-1", name: "Temple Complex" },
        { attractionId: "attr-2", name: "Food Street" },
      ],
    });

    expect(result).toEqual({
      rankedAttractionIds: ["attr-2", "attr-1"],
      explanation: "Food-first ordering.",
    });
  });

  test("falls back to deterministic provider when Groq key is missing", () => {
    const loggerInstance = {
      warn: jest.fn(),
    };
    const provider = createAiPlanningProvider({
      envConfig: {
        AI_PLANNING_PROVIDER: "groq",
        GROQ_MODEL: "llama-3.1-8b-instant",
        GROQ_CHAT_ENDPOINT: "https://api.groq.com/openai/v1/chat/completions",
        GROQ_TIMEOUT_MS: 1000,
        GROQ_MAX_CANDIDATES: 10,
        GROQ_ENABLE_EXPLANATION: true,
        GROQ_TEMPERATURE: 0,
        GROQ_TOP_P: 1,
      },
      loggerInstance,
    });

    expect(provider.name).toBe("deterministic");
    expect(loggerInstance.warn).toHaveBeenCalledWith(
      expect.stringContaining("GROQ_API_KEY"),
      expect.objectContaining({
        provider: "groq",
      })
    );
  });
});
