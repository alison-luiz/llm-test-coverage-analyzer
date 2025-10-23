import { Octokit } from "@octokit/rest";
import { logger } from "../utils/logger";
import { config } from "../config";
import { Repository } from "../types";

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: config.githubToken,
    });
  }

  async searchRepositories(
    language: string,
    minStars: number = 100,
    maxResults: number = 10
  ): Promise<Repository[]> {
    try {
      logger.info(`Buscando repositórios: ${language}, min stars: ${minStars}`);

      const response = await this.octokit.search.repos({
        q: `language:${language} stars:>=${minStars}`,
        sort: "stars",
        order: "desc",
        per_page: maxResults,
      });

      const repositories: Repository[] = response.data.items.map((repo) => ({
        owner: repo.owner?.login || "unknown",
        name: repo.name,
        url: repo.html_url,
        language: repo.language || language,
      }));

      logger.info(`${repositories.length} repositórios encontrados`);
      return repositories;
    } catch (error) {
      logger.error("Erro ao buscar repositórios", error);
      throw error;
    }
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });
      return response.data;
    } catch (error) {
      logger.error(`Erro ao obter info do repo ${owner}/${repo}`, error);
      throw error;
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if ("content" in response.data) {
        return Buffer.from(response.data.content, "base64").toString("utf-8");
      }

      throw new Error("Arquivo não encontrado ou é um diretório");
    } catch (error) {
      logger.error(`Erro ao obter conteúdo: ${owner}/${repo}/${path}`, error);
      throw error;
    }
  }

  async cloneRepository(
    owner: string,
    repo: string,
    destPath: string
  ): Promise<string> {
    const { execSync } = require("child_process");
    const path = require("path");

    try {
      const repoUrl = `https://github.com/${owner}/${repo}.git`;
      const fullPath = path.join(destPath, repo);

      logger.info(`Clonando repositório: ${repoUrl}`);
      execSync(`git clone ${repoUrl} ${fullPath}`, { stdio: "inherit" });

      logger.info(`Repositório clonado em: ${fullPath}`);
      return fullPath;
    } catch (error) {
      logger.error(`Erro ao clonar repositório ${owner}/${repo}`, error);
      throw error;
    }
  }
}
