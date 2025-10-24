import path from "path";
import { logger } from "../utils/logger";
import { FileSystemUtils } from "../utils/fileSystem";
import { GitHubService } from "./GitHubService";
import { CoverageService } from "./CoverageService";
import { LLMService } from "./LLMService";
import { CoverageReport, GapAnalysis } from "../types";
import { config } from "../config";

export class AnalysisOrchestrator {
  private githubService: GitHubService;
  private coverageService: CoverageService;
  private llmService: LLMService;

  constructor() {
    this.githubService = new GitHubService();
    this.coverageService = new CoverageService();
    this.llmService = new LLMService();
  }

  async analyzeRepository(
    owner: string,
    repoName: string
  ): Promise<GapAnalysis> {
    logger.info(`🔍 Iniciando análise: ${owner}/${repoName}`);

    try {
      // 1. Clonar repositório
      const repoPath = await this.cloneRepo(owner, repoName);

      // 2. Executar análise de cobertura
      const coverageReport = await this.runCoverageAnalysis(repoPath);

      // 3. Extrair snippets de código
      const reportWithCode = await this.enrichWithCodeSnippets(
        coverageReport,
        repoPath
      );

      // 4. Analisar com LLM
      const llmResponse = await this.analyzWithLLM(reportWithCode);

      // 5. Gerar análise final
      const analysis = this.buildGapAnalysis(
        repoName,
        reportWithCode,
        llmResponse
      );

      // 6. Salvar resultados
      await this.saveResults(analysis);

      logger.info(`✅ Análise concluída: ${repoName}`);
      return analysis;
    } catch (error) {
      logger.error(`❌ Erro na análise de ${owner}/${repoName}`, error);
      throw error;
    }
  }

  async analyzeMultipleRepositories(
    language: string,
    minStars: number = 100,
    maxRepos: number = 5
  ): Promise<GapAnalysis[]> {
    logger.info(`🔍 Buscando repositórios: ${language}`);

    const repositories = await this.githubService.searchRepositories(
      language,
      minStars,
      maxRepos
    );

    logger.info(`Encontrados ${repositories.length} repositórios`);

    const results: GapAnalysis[] = [];

    for (const repo of repositories) {
      try {
        const analysis = await this.analyzeRepository(repo.owner, repo.name);
        results.push(analysis);

        // Pequeno delay entre análises
        await this.delay(2000);
      } catch (error) {
        logger.error(`Pulando ${repo.owner}/${repo.name}`, error);
        continue;
      }
    }

    logger.info(
      `✅ Análise completa: ${results.length}/${repositories.length} repos`
    );
    return results;
  }

  async analyzeLocalProject(projectPath: string): Promise<GapAnalysis> {
    logger.info(`🔍 Analisando projeto local: ${projectPath}`);

    try {
      const projectName = path.basename(projectPath);

      // 1. Executar cobertura
      const coverageReport = await this.runCoverageAnalysis(projectPath);

      // 2. Extrair código
      const reportWithCode = await this.enrichWithCodeSnippets(
        coverageReport,
        projectPath
      );

      // 3. Analisar com LLM
      const llmResponse = await this.analyzWithLLM(reportWithCode);

      // 4. Gerar análise
      const analysis = this.buildGapAnalysis(
        projectName,
        reportWithCode,
        llmResponse
      );

      // 5. Salvar
      await this.saveResults(analysis);

      logger.info(`✅ Análise local concluída`);
      return analysis;
    } catch (error) {
      logger.error("❌ Erro na análise local", error);
      throw error;
    }
  }

  private async cloneRepo(owner: string, repoName: string): Promise<string> {
    logger.info(`📦 Clonando ${owner}/${repoName}...`);
    return await this.githubService.cloneRepository(
      owner,
      repoName,
      config.dataPath.repositories
    );
  }

  private async runCoverageAnalysis(
    projectPath: string
  ): Promise<CoverageReport> {
    logger.info("📊 Executando análise de cobertura...");
    return await this.coverageService.runCoverage(projectPath);
  }

  private async enrichWithCodeSnippets(
    report: CoverageReport,
    projectPath: string
  ): Promise<CoverageReport> {
    logger.info("📝 Extraindo snippets de código...");
    const filesWithCode = await this.coverageService.extractCodeSnippets(
      projectPath,
      report.uncoveredFiles
    );

    return {
      ...report,
      uncoveredFiles: filesWithCode,
    };
  }

  private async analyzWithLLM(report: CoverageReport): Promise<any> {
    logger.info("🤖 Analisando com LLM...");
    return await this.llmService.analyzeGaps(report);
  }

  private buildGapAnalysis(
    repoName: string,
    coverageReport: CoverageReport,
    llmResponse: any
  ): GapAnalysis {
    return {
      repositoryName: repoName,
      gaps: llmResponse.identifiedGaps || [],
      prioritizedGaps: llmResponse.prioritization || [],
      suggestions: llmResponse.recommendations || [],
      analysisDate: new Date(),
    };
  }

  private async saveResults(analysis: GapAnalysis): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${analysis.repositoryName}_${timestamp}.json`;
    const filePath = path.join(config.dataPath.reports, fileName);

    await FileSystemUtils.writeJSON(filePath, analysis);
    logger.info(`💾 Resultados salvos: ${filePath}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
