const DEFAULT_HF_CHAT_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_HF_MODEL_ID = "Qwen/Qwen2.5-7B-Instruct";

const normalizeText = (value) => String(value || "").trim();
const toFiniteNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};
const normalizeCoordinate = (value) => {
  const parsed = toFiniteNumber(value);

  return parsed === null ? null : Number(parsed.toFixed(4));
};
const getRequestedItemSlots = (trip) => {
  const parsed = Number(trip?.requestedItemSlots);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractFencedJsonChunk = (rawText) => {
  const text = normalizeText(rawText);
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  return match?.[1] ? normalizeText(match[1]) : "";
};

const extractJsonObjectChunk = (rawText) => {
  const text = normalizeText(rawText);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return text.slice(start, end + 1);
};

const extractJsonArrayChunk = (rawText) => {
  const text = normalizeText(rawText);
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return text.slice(start, end + 1);
};

const parseJsonFromContent = (content) => {
  const text = normalizeText(content);

  if (!text) {
    return null;
  }

  const candidates = [
    text,
    extractFencedJsonChunk(text),
    extractJsonObjectChunk(text),
    extractJsonArrayChunk(text),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      // Try the next fallback chunk.
    }
  }

  return null;
};

const getArrayValue = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const arrayCandidate = [
    value.rankedAttractionIds,
    value.attractionIds,
    value.ids,
    value.ranking,
    value.result,
    value.data,
  ].find((item) => Array.isArray(item));

  return arrayCandidate || [];
};

const normalizeRankedAttractionIds = (value, knownAttractionIds) => {
  const knownIds = new Set(
    (Array.isArray(knownAttractionIds) ? knownAttractionIds : [])
      .map((item) => normalizeText(item))
      .filter(Boolean)
  );
  const seenIds = new Set();
  const normalizedIds = [];

  getArrayValue(value).forEach((item) => {
    const attractionId =
      typeof item === "string" || typeof item === "number"
        ? normalizeText(item)
        : normalizeText(item?.attractionId || item?.id);

    if (!attractionId || seenIds.has(attractionId) || !knownIds.has(attractionId)) {
      return;
    }

    seenIds.add(attractionId);
    normalizedIds.push(attractionId);
  });

  return normalizedIds;
};

const parseRankingResponse = (content, knownAttractionIds = []) => {
  const parsed = parseJsonFromContent(content);

  if (!parsed) {
    return null;
  }

  if (Array.isArray(parsed)) {
    return {
      rankedAttractionIds: normalizeRankedAttractionIds(parsed, knownAttractionIds),
      explanation: null,
    };
  }

  if (typeof parsed !== "object") {
    return null;
  }

  const explanation = [
    parsed.explanation,
    parsed.reasoning,
    parsed.summary,
    parsed.notes,
  ].find((value) => typeof value === "string" && normalizeText(value));

  return {
    rankedAttractionIds: normalizeRankedAttractionIds(parsed, knownAttractionIds),
    explanation: explanation ? normalizeText(explanation) : null,
  };
};

const createHuggingFaceError = (
  message,
  { code = "AI_UNAVAILABLE", status = 502, cause } = {}
) => {
  const error = new Error(message);
  error.name = "HuggingFaceError";
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
    "Return ONLY valid JSON.",
    "rankedAttractionIds must be a subset of the provided candidate IDs.",
    "Do not invent attractions, places, dates, or times.",
    "Prefer geographically coherent same-day clusters.",
    "Inside a local cluster, rank morning-friendly heritage or temple stops before sunset or evening venues, and nightlife-oriented stops latest.",
    includeExplanation
      ? 'Return {"rankedAttractionIds":["uuid"],"explanation":"short rationale"}.'
      : 'Return {"rankedAttractionIds":["uuid"]}.',
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
    (candidate) => {
      const latitude = normalizeCoordinate(candidate?.latitude);
      const longitude = normalizeCoordinate(candidate?.longitude);
      const summary = {
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
      };

      const bestVisitTime = normalizeText(candidate?.bestVisitTime);

      if (bestVisitTime) {
        summary.bestVisitTime = bestVisitTime;
      }

      if (
        candidate?.openingHoursHint &&
        typeof candidate.openingHoursHint === "object"
      ) {
        const opensAt = normalizeText(candidate.openingHoursHint.opensAt);
        const closesAt = normalizeText(candidate.openingHoursHint.closesAt);

        if (opensAt || closesAt) {
          summary.openingHoursHint = {
            opensAt: opensAt || null,
            closesAt: closesAt || null,
          };
        }
      }

      summary.location =
        latitude === null || longitude === null
          ? normalizeText(candidate?.fullAddress) || null
          : {
              latitude,
              longitude,
            };

      return summary;
    }
  );

  return [
    "Rank these candidates for the trip.",
    "Prioritize preference fit first, then quality and itinerary usefulness.",
    "Keep nearby attractions grouped.",
    "Treat bestVisitTime and openingHoursHint as strong timing hints.",
    "Within one area, place earlier-day or earlier-closing heritage stops before sunset viewpoints, and place sunset culinary or nightlife venues later.",
    "Use budget only as a soft signal. Use each ID once.",
    includeExplanation
      ? "Include a short explanation under explanation."
      : "Do not include explanation.",
    "",
    `Trip: ${JSON.stringify(tripSummary)}`,
    `Preferences: ${JSON.stringify(preferenceSummary)}`,
    `Candidates: ${JSON.stringify(candidateSummary)}`,
  ].join("\n");
};

const readChoiceContent = (payload) => {
  if (typeof payload?.choices?.[0]?.message?.content === "string") {
    return payload.choices[0].message.content;
  }

  if (typeof payload?.choices?.[0]?.text === "string") {
    return payload.choices[0].text;
  }

  if (typeof payload?.generated_text === "string") {
    return payload.generated_text;
  }

  return "";
};

const createHuggingFaceClient = ({
  apiToken,
  chatEndpoint = DEFAULT_HF_CHAT_ENDPOINT,
  model = DEFAULT_HF_MODEL_ID,
  timeoutMs = 20000,
  maxCandidates = 30,
  includeExplanation = true,
  temperature = 0,
  topP = 1,
  fetchImpl = global.fetch,
} = {}) => ({
  async rankCandidates({ trip, preferences, candidates, model: modelOverride } = {}) {
    if (!apiToken) {
      throw createHuggingFaceError("Hugging Face API token is not configured.", {
        code: "AI_MISCONFIGURED",
        status: 500,
      });
    }

    if (typeof fetchImpl !== "function") {
      throw createHuggingFaceError("Fetch is not available for Hugging Face requests.", {
        code: "AI_MISCONFIGURED",
        status: 500,
      });
    }

    const requestedItemSlots = getRequestedItemSlots(trip);
    const effectiveMaxCandidates = requestedItemSlots
      ? Math.min(maxCandidates, Math.max(8, requestedItemSlots))
      : maxCandidates;
    const rankedCandidates = (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => normalizeText(candidate?.attractionId))
      .slice(0, effectiveMaxCandidates);
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
          Authorization: `Bearer ${apiToken}`,
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
          temperature,
          top_p: topP,
          max_tokens: includeExplanation ? 500 : 350,
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
          typeof payload?.error === "string"
            ? payload.error
            : `Hugging Face request failed with status ${response.status}.`;

        if (response.status === 408 || response.status === 504) {
          throw createHuggingFaceError(message, {
            code: "AI_TIMEOUT",
            status: 504,
          });
        }

        throw createHuggingFaceError(message, {
          code: "AI_UNAVAILABLE",
          status: 502,
        });
      }

      const content = readChoiceContent(payload);

      if (!content) {
        throw createHuggingFaceError(
          "Hugging Face response did not include message content.",
          {
            code: "AI_BAD_RESPONSE",
            status: 502,
          }
        );
      }

      const parsed = parseRankingResponse(content, knownAttractionIds);

      if (!parsed || !parsed.rankedAttractionIds.length) {
        throw createHuggingFaceError(
          "Hugging Face response could not be parsed into ranked attraction IDs.",
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
        throw createHuggingFaceError("Hugging Face request timed out.", {
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
        throw createHuggingFaceError("Hugging Face service is unavailable.", {
          code: "AI_UNAVAILABLE",
          status: 502,
          cause: error,
        });
      }

      throw createHuggingFaceError("Hugging Face service is unavailable.", {
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
  createHuggingFaceClient,
  extractFencedJsonChunk,
  extractJsonArrayChunk,
  extractJsonObjectChunk,
  parseRankingResponse,
};
