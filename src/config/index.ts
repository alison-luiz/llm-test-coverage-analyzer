import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

interface Config {
  openaiApiKey: string;
  githubToken: string;
  nodeEnv: string;
  openaiModel: string;
  dataPath: {
    repositories: string;
    reports: string;
  };
}

function validateConfig(): Config {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!openaiApiKey) {
    logger.error("OPENAI_API_KEY não configurada no .env");
    throw new Error("OPENAI_API_KEY é obrigatória");
  }

  if (!githubToken) {
    logger.warn("GITHUB_TOKEN não configurada - funcionalidades limitadas");
  }

  return {
    openaiApiKey,
    githubToken: githubToken || "",
    nodeEnv: process.env.NODE_ENV || "development",
    openaiModel: process.env.OPENAI_MODEL || "gpt-5",
    dataPath: {
      repositories: "./data/repositories",
      reports: "./data/reports",
    },
  };
}

export const config = validateConfig();
