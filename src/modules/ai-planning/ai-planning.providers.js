const { logger: defaultLogger } = require("../../config/logger");

const normalizeProviderRanking = (candidates, rankedAttractionIds) => {
  if (!Array.isArray(rankedAttractionIds) || !rankedAttractionIds.length) {
    return candidates;
  }

  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.attractionId, candidate])
  );
  const rankedCandidates = [];
  const usedIds = new Set();

  rankedAttractionIds.forEach((attractionId) => {
    if (!candidatesById.has(attractionId) || usedIds.has(attractionId)) {
      return;
    }

    rankedCandidates.push(candidatesById.get(attractionId));
    usedIds.add(attractionId);
  });

  candidates.forEach((candidate) => {
    if (!usedIds.has(candidate.attractionId)) {
      rankedCandidates.push(candidate);
    }
  });

  return rankedCandidates;
};

const deterministicPlanningProvider = {
  name: "deterministic",
  async rankCandidates({ candidates }) {
    return candidates.map((candidate) => candidate.attractionId);
  },
};

const buildDeterministicResult = (candidates) => ({
  rankedAttractionIds: candidates.map((candidate) => candidate.attractionId),
  explanation: null,
});

// Provider adapters only rerank known DB candidates. They never create attractions.
const createExternalPlanningProvider = ({
  providerName,
  inferenceClient,
  model = "travel-itinerary-ranking",
  logger = defaultLogger,
} = {}) => ({
  name: providerName,
  async rankCandidates({ candidates, trip, preferences }) {
    if (!inferenceClient || typeof inferenceClient.rankCandidates !== "function") {
      return buildDeterministicResult(candidates);
    }

    try {
      const result = await inferenceClient.rankCandidates({
        model,
        trip,
        preferences,
        candidates: candidates.map((candidate) => ({
          attractionId: candidate.attractionId,
          name: candidate.name,
          categorySlugs: candidate.categorySlugs,
          rating: candidate.rating,
          estimatedDurationMinutes: candidate.estimatedDurationMinutes,
        })),
      });

      if (Array.isArray(result)) {
        return {
          rankedAttractionIds: result,
          explanation: null,
        };
      }

      return {
        rankedAttractionIds: Array.isArray(result?.rankedAttractionIds)
          ? result.rankedAttractionIds
          : [],
        explanation:
          typeof result?.explanation === "string" ? result.explanation : null,
      };
    } catch (error) {
      logger.warn(
        "AI planning provider reranking failed. Falling back to deterministic order.",
        {
          provider: providerName,
          model,
          code: error?.code || null,
          status: error?.status || error?.statusCode || null,
          message: error?.message || "Unknown error",
        }
      );

      return buildDeterministicResult(candidates);
    }
  },
});

const createHuggingFacePlanningProvider = (options = {}) =>
  createExternalPlanningProvider({
    providerName: "hugging-face",
    ...options,
  });

const createGroqPlanningProvider = (options = {}) =>
  createExternalPlanningProvider({
    providerName: "groq",
    ...options,
  });

module.exports = {
  createGroqPlanningProvider,
  createHuggingFacePlanningProvider,
  deterministicPlanningProvider,
  normalizeProviderRanking,
};
