const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default("stoury-api"),
  CLIENT_ORIGIN: z.string().default("*"),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  ADMIN_ENRICHMENT_ENABLED: z.boolean().default(true),
  ADMIN_ENRICHMENT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  ADMIN_ENRICHMENT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  ADMIN_ENRICHMENT_BATCH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  ENABLE_HTTPS_UPGRADE_CSP: z.boolean().default(false),
  OPENAPI_SERVER_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional()
  ),
  AI_PLANNING_PROVIDER: z
    .enum(["deterministic", "hugging-face", "groq"])
    .default("deterministic"),
  HF_API_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  HF_MODEL_ID: z.string().default("Qwen/Qwen2.5-7B-Instruct"),
  HF_CHAT_ENDPOINT: z
    .string()
    .url()
    .default("https://router.huggingface.co/v1/chat/completions"),
  HF_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  HF_MAX_CANDIDATES: z.coerce.number().int().positive().default(30),
  HF_ENABLE_EXPLANATION: z.boolean().default(true),
  HF_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  HF_TOP_P: z.coerce.number().positive().max(1).default(1),
  GROQ_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  GROQ_CHAT_ENDPOINT: z
    .string()
    .url()
    .default("https://api.groq.com/openai/v1/chat/completions"),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  GROQ_MAX_CANDIDATES: z.coerce.number().int().positive().default(30),
  GROQ_ENABLE_EXPLANATION: z.boolean().default(true),
  GROQ_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  GROQ_TOP_P: z.coerce.number().positive().max(1).default(1),
  GOOGLE_PLACES_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  GOOGLE_PLACES_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  GOOGLE_PLACES_TEXT_SEARCH_URL: z
    .string()
    .url()
    .default("https://maps.googleapis.com/maps/api/place/textsearch/json"),
  GOOGLE_PLACES_DETAILS_URL: z
    .string()
    .url()
    .default("https://maps.googleapis.com/maps/api/place/details/json"),
});

const parsedEnv = envSchema.safeParse({
  ...process.env,
  ADMIN_ENRICHMENT_ENABLED: parseBoolean(process.env.ADMIN_ENRICHMENT_ENABLED, true),
  ENABLE_HTTPS_UPGRADE_CSP: parseBoolean(process.env.ENABLE_HTTPS_UPGRADE_CSP, false),
  HF_ENABLE_EXPLANATION: parseBoolean(process.env.HF_ENABLE_EXPLANATION, true),
  GROQ_ENABLE_EXPLANATION: parseBoolean(process.env.GROQ_ENABLE_EXPLANATION, true),
});

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  throw new Error(`Invalid environment configuration: ${JSON.stringify(errors)}`);
}

module.exports = parsedEnv.data;
