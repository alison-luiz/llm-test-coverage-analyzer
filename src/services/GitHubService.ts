import { Octokit } from "@octokit/rest";
import { logger } from "../utils/logger";
import { FileSystemUtils } from "../utils/fileSystem";
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

      // Verificar se o diretório já existe e removê-lo se necessário
      const exists = await FileSystemUtils.fileExists(fullPath);
      if (exists) {
        logger.info(`Diretório já existe, removendo: ${fullPath}`);
        await FileSystemUtils.removeDirectory(fullPath);
      }

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
