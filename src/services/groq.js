const { parseRankingResponse } = require("./huggingface");

const DEFAULT_GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

const normalizeText = (value) => String(value || "").trim();

const createGroqError = (
  message,
  { code = "AI_UNAVAILABLE", status = 502, cause } = {}
) => {
  const error = new Error(message);
  error.name = "GroqError";
  error.code = code;
  error.status = status;
  error.statusCode = status;

  if (cause) {
    error.cause = cause;
  }

  return error;
};

const buildSystemPrompt = (includeExplanation) =>
  [
    "You rerank already-curated travel attractions.",
    "Return ONLY a valid JSON object.",
    "rankedAttractionIds must be a subset of the provided candidate IDs.",
    "Do not invent attractions, places, dates, or times.",
    includeExplanation
      ? "Use explanation for one short rationale sentence."
      : "Set explanation to null.",
  ].join(" ");

const buildUserPrompt = ({ trip, preferences, candidates, includeExplanation }) => {
  const tripSummary = {
    tripId: normalizeText(trip?.tripId),
    destinationId: normalizeText(trip?.destinationId),
    startDate: normalizeText(trip?.startDate),
    endDate: normalizeText(trip?.endDate),
    budget:
      trip?.budget === undefined || trip?.budget === null
        ? null
        : Number(trip.budget),
    budgetPerDay:
      trip?.budgetPerDay === undefined || trip?.budgetPerDay === null
        ? null
        : Number(trip.budgetPerDay),
  };
  const preferenceSummary = (Array.isArray(preferences) ? preferences : []).map(
    (preference) => ({
      id: normalizeText(preference?.id),
      slug: normalizeText(preference?.slug),
      name: normalizeText(preference?.name),
    })
  );
  const candidateSummary = (Array.isArray(candidates) ? candidates : []).map(
    (candidate) => ({
      attractionId: normalizeText(candidate?.attractionId),
      name: normalizeText(candidate?.name),
      categorySlugs: Array.isArray(candidate?.categorySlugs)
        ? candidate.categorySlugs.map((slug) => normalizeText(slug)).filter(Boolean)
        : [],
      rating:
        candidate?.rating === undefined || candidate?.rating === null
          ? null
          : Number(candidate.rating),
      estimatedDurationMinutes:
        candidate?.estimatedDurationMinutes === undefined ||
        candidate?.estimatedDurationMinutes === null
          ? null
          : Number(candidate.estimatedDurationMinutes),
    })
  );

  return [
    "Rank the candidate attractions for the trip context below.",
    "Prioritize preference fit first, then attraction quality and itinerary usefulness.",
    "Use budget only as a soft signal. Do not infer exact prices.",
    "Use every candidate ID at most once.",
    'Return exactly this shape: {"rankedAttractionIds":["id-1"],"explanation":"short rationale"}',
    includeExplanation
      ? "Include a short explanation."
      : "Set explanation to null.",
    "",
    `Trip: ${JSON.stringify(tripSummary)}`,
    `Preferences: ${JSON.stringify(preferenceSummary)}`,
    `Candidates: ${JSON.stringify(candidateSummary)}`,
  ].join("\n");
};

const buildResponseFormat = () => ({
  type: "json_object",
});

const readChoiceContent = (payload) => {
  if (typeof payload?.choices?.[0]?.message?.content === "string") {
    return payload.choices[0].message.content;
  }

  if (typeof payload?.choices?.[0]?.text === "string") {
    return payload.choices[0].text;
  }

  return "";
};

const createGroqClient = ({
  apiKey,
  chatEndpoint = DEFAULT_GROQ_CHAT_ENDPOINT,
  model = DEFAULT_GROQ_MODEL,
  timeoutMs = 20000,
  maxCandidates = 30,
  includeExplanation = true,
  temperature = 0,
  topP = 1,
  fetchImpl = global.fetch,
} = {}) => ({
  async rankCandidates({ trip, preferences, candidates, model: modelOverride } = {}) {
    if (!apiKey) {
      throw createGroqError("Groq API key is not configured.", {
        code: "AI_MISCONFIGURED",
        status: 500,
      });
    }

    if (typeof fetchImpl !== "function") {
      throw createGroqError("Fetch is not available for Groq requests.", {
        code: "AI_MISCONFIGURED",
        status: 500,
      });
    }

    const rankedCandidates = (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => normalizeText(candidate?.attractionId))
      .slice(0, maxCandidates);
    const knownAttractionIds = rankedCandidates.map((candidate) =>
      normalizeText(candidate.attractionId)
    );

    if (!knownAttractionIds.length) {
      return {
        rankedAttractionIds: [],
        explanation: null,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(chatEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelOverride || model,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(includeExplanation),
            },
            {
              role: "user",
              content: buildUserPrompt({
                trip,
                preferences,
                candidates: rankedCandidates,
                includeExplanation,
              }),
            },
          ],
          response_format: buildResponseFormat({
            knownAttractionIds,
            includeExplanation,
          }),
          temperature,
          top_p: topP,
          max_tokens: includeExplanation ? 280 : 180,
          stream: false,
        }),
        signal: controller.signal,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error?.message ||
          (typeof payload?.error === "string" ? payload.error : null) ||
          `Groq request failed with status ${response.status}.`;

        if (response.status === 408 || response.status === 504) {
          throw createGroqError(message, {
            code: "AI_TIMEOUT",
            status: 504,
          });
        }

        throw createGroqError(message, {
          code: "AI_UNAVAILABLE",
          status: 502,
        });
      }

      const content = readChoiceContent(payload);

      if (!content) {
        throw createGroqError("Groq response did not include message content.", {
          code: "AI_BAD_RESPONSE",
          status: 502,
        });
      }

      const parsed = parseRankingResponse(content, knownAttractionIds);

      if (!parsed || !parsed.rankedAttractionIds.length) {
        throw createGroqError(
          "Groq response could not be parsed into ranked attraction IDs.",
          {
            code: "AI_BAD_RESPONSE",
            status: 502,
          }
        );
      }

      return parsed;
    } catch (error) {
      if (error?.code && error?.status) {
        throw error;
      }

      const message = normalizeText(error?.message).toLowerCase();

      if (
        error?.name === "AbortError" ||
        message.includes("abort") ||
        message.includes("timeout")
      ) {
        throw createGroqError("Groq request timed out.", {
          code: "AI_TIMEOUT",
          status: 504,
          cause: error,
        });
      }

      if (
        error?.code === "ECONNRESET" ||
        error?.code === "ENOTFOUND" ||
        error?.code === "ECONNREFUSED"
      ) {
        throw createGroqError("Groq service is unavailable.", {
          code: "AI_UNAVAILABLE",
          status: 502,
          cause: error,
        });
      }

      throw createGroqError("Groq service is unavailable.", {
        code: "AI_UNAVAILABLE",
        status: 502,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

module.exports = {
  createGroqClient,
};
