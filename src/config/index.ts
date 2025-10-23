import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

export type LLMProvider = "openai" | "anthropic";

interface Config {
  llmProvider: LLMProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  githubToken: string;
  nodeEnv: string;
  openaiModel: string;
  anthropicModel: string;
  dataPath: {
    repositories: string;
    reports: string;
  };
}

function validateConfig(): Config {
  const llmProvider = (
    process.env.LLM_PROVIDER || "openai"
  ).toLowerCase() as LLMProvider;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (llmProvider === "openai" && !openaiApiKey) {
    logger.error("OPENAI_API_KEY não configurada no .env");
    throw new Error("OPENAI_API_KEY é obrigatória quando LLM_PROVIDER=openai");
  }

  if (llmProvider === "anthropic" && !anthropicApiKey) {
    logger.error("ANTHROPIC_API_KEY não configurada no .env");
    throw new Error(
      "ANTHROPIC_API_KEY é obrigatória quando LLM_PROVIDER=anthropic"
    );
  }

  if (!["openai", "anthropic"].includes(llmProvider)) {
    logger.error(`LLM_PROVIDER inválido: ${llmProvider}`);
    throw new Error("LLM_PROVIDER deve ser 'openai' ou 'anthropic'");
  }

  if (!githubToken) {
    logger.warn("GITHUB_TOKEN não configurada - funcionalidades limitadas");
  }

  logger.info(`🤖 Usando provider: ${llmProvider.toUpperCase()}`);

  return {
    llmProvider,
    openaiApiKey,
    anthropicApiKey,
    githubToken: githubToken || "",
    nodeEnv: process.env.NODE_ENV || "development",
    openaiModel: process.env.OPENAI_MODEL || "gpt-5",
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    dataPath: {
      repositories: "./data/repositories",
      reports: "./data/reports",
    },
  };
}

export const config = validateConfig();
