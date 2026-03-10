const env = require("../../config/env");
const { logger } = require("../../config/logger");
const { createHuggingFaceClient } = require("../../services/huggingface");
const { createGroqClient } = require("../../services/groq");
const {
  createGroqPlanningProvider,
  createHuggingFacePlanningProvider,
  deterministicPlanningProvider,
} = require("./ai-planning.providers");

const createAiPlanningProvider = ({
  envConfig = env,
  fetchImpl,
  loggerInstance = logger,
} = {}) => {
  if (envConfig.AI_PLANNING_PROVIDER === "hugging-face") {
    if (!envConfig.HF_API_TOKEN) {
      loggerInstance.warn(
        "AI planning provider is set to hugging-face without HF_API_TOKEN. Falling back to deterministic provider.",
        {
          provider: envConfig.AI_PLANNING_PROVIDER,
        }
      );

      return deterministicPlanningProvider;
    }

    const inferenceClient = createHuggingFaceClient({
      apiToken: envConfig.HF_API_TOKEN,
      chatEndpoint: envConfig.HF_CHAT_ENDPOINT,
      model: envConfig.HF_MODEL_ID,
      timeoutMs: envConfig.HF_TIMEOUT_MS,
      maxCandidates: envConfig.HF_MAX_CANDIDATES,
      includeExplanation: envConfig.HF_ENABLE_EXPLANATION,
      temperature: envConfig.HF_TEMPERATURE,
      topP: envConfig.HF_TOP_P,
      ...(fetchImpl ? { fetchImpl } : {}),
    });

    return createHuggingFacePlanningProvider({
      inferenceClient,
      logger: loggerInstance,
      model: envConfig.HF_MODEL_ID,
    });
  }

  if (envConfig.AI_PLANNING_PROVIDER === "groq") {
    const groqApiKey = envConfig.GROQ_API_KEY;

    if (!groqApiKey) {
      loggerInstance.warn(
        "AI planning provider is set to groq without GROQ_API_KEY. Falling back to deterministic provider.",
        {
          provider: envConfig.AI_PLANNING_PROVIDER,
        }
      );

      return deterministicPlanningProvider;
    }

    const inferenceClient = createGroqClient({
      apiKey: groqApiKey,
      chatEndpoint: envConfig.GROQ_CHAT_ENDPOINT,
      model: envConfig.GROQ_MODEL,
      timeoutMs: envConfig.GROQ_TIMEOUT_MS,
      maxCandidates: envConfig.GROQ_MAX_CANDIDATES,
      includeExplanation: envConfig.GROQ_ENABLE_EXPLANATION,
      temperature: envConfig.GROQ_TEMPERATURE,
      topP: envConfig.GROQ_TOP_P,
      ...(fetchImpl ? { fetchImpl } : {}),
    });

    return createGroqPlanningProvider({
      inferenceClient,
      logger: loggerInstance,
      model: envConfig.GROQ_MODEL,
    });
  }

  return deterministicPlanningProvider;
};

module.exports = {
  createAiPlanningProvider,
};
