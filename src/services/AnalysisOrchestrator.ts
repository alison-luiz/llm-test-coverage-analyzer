import path from "path";
import { logger } from "../utils/logger";
import { FileSystemUtils } from "../utils/fileSystem";
import { logCollector } from "../utils/logCollector";
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
    logCollector.startCapture();
    logger.info(`🔍 Iniciando análise: ${owner}/${repoName}`);
    const startTime = Date.now();

    try {
      // 1. Clonar repositório
      const cloneStartTime = Date.now();
      const repoPath = await this.cloneRepo(owner, repoName);
      const cloneTime = Date.now() - cloneStartTime;
      logger.info(
        `⏱️  Clonagem concluída em ${(cloneTime / 1000).toFixed(2)}s`
      );

      // 2. Executar análise de cobertura
      const coverageReport = await this.runCoverageAnalysis(repoPath);

      // 3. Extrair snippets de código
      const codeExtractionStartTime = Date.now();
      const reportWithCode = await this.enrichWithCodeSnippets(
        coverageReport,
        repoPath
      );
      const codeExtractionTime = Date.now() - codeExtractionStartTime;
      logger.info(
        `⏱️  Extração de código concluída em ${(
          codeExtractionTime / 1000
        ).toFixed(2)}s`
      );

      // 4. Analisar com LLM
      const llmStartTime = Date.now();
      const llmResponse = await this.analyzWithLLM(reportWithCode);
      const llmAnalysisTime = Date.now() - llmStartTime;
      logger.info(
        `⏱️  Análise LLM concluída em ${(llmAnalysisTime / 1000).toFixed(2)}s`
      );

      // 5. Gerar análise final
      const executionTime = Date.now() - startTime;
      const analysis = this.buildGapAnalysis(
        repoName,
        reportWithCode,
        llmResponse,
        executionTime,
        {
          cloneTime,
          installationTime: coverageReport.installationTime || 0,
          testTime: coverageReport.testTime || 0,
          codeExtractionTime,
          llmAnalysisTime,
        }
      );

      // 6. Salvar resultados
      await this.saveResults(analysis);

      logger.info(`✅ Análise concluída: ${repoName}`);
      logCollector.stopCapture();
      return analysis;
    } catch (error) {
      logger.error(`❌ Erro na análise de ${owner}/${repoName}`, error);
      logCollector.stopCapture();
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
    logCollector.startCapture();
    logger.info(`🔍 Analisando projeto local: ${projectPath}`);
    const startTime = Date.now();

    try {
      const projectName = path.basename(projectPath);

      // 1. Executar cobertura
      const coverageReport = await this.runCoverageAnalysis(projectPath);

      // 2. Extrair código
      const codeExtractionStartTime = Date.now();
      const reportWithCode = await this.enrichWithCodeSnippets(
        coverageReport,
        projectPath
      );
      const codeExtractionTime = Date.now() - codeExtractionStartTime;
      logger.info(
        `⏱️  Extração de código concluída em ${(
          codeExtractionTime / 1000
        ).toFixed(2)}s`
      );

      // 3. Analisar com LLM
      const llmStartTime = Date.now();
      const llmResponse = await this.analyzWithLLM(reportWithCode);
      const llmAnalysisTime = Date.now() - llmStartTime;
      logger.info(
        `⏱️  Análise LLM concluída em ${(llmAnalysisTime / 1000).toFixed(2)}s`
      );

      // 4. Gerar análise
      const executionTime = Date.now() - startTime;
      const analysis = this.buildGapAnalysis(
        projectName,
        reportWithCode,
        llmResponse,
        executionTime,
        {
          cloneTime: 0, // Não há clonagem em análise local
          installationTime: coverageReport.installationTime || 0,
          testTime: coverageReport.testTime || 0,
          codeExtractionTime,
          llmAnalysisTime,
        }
      );

      // 5. Salvar
      await this.saveResults(analysis);

      logger.info(`✅ Análise local concluída`);
      logCollector.stopCapture();
      return analysis;
    } catch (error) {
      logger.error("❌ Erro na análise local", error);
      logCollector.stopCapture();
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

  private getLLMModelName(): string {
    if (config.llmProvider === "openai") {
      return config.openaiModel;
    } else if (config.llmProvider === "anthropic") {
      return config.anthropicModel;
    }
    return "undefined";
  }

  private buildGapAnalysis(
    repoName: string,
    coverageReport: CoverageReport,
    llmResponse: any,
    executionTime: number,
    timeDetails: {
      cloneTime: number;
      installationTime: number;
      testTime: number;
      codeExtractionTime: number;
      llmAnalysisTime: number;
    }
  ): GapAnalysis {
    return {
      repositoryName: repoName,
      gaps: llmResponse.identifiedGaps || [],
      prioritizedGaps: llmResponse.prioritization || [],
      suggestions: llmResponse.recommendations || [],
      analysisDate: new Date(),
      executionTime,
      executionTimeDetails: timeDetails,
      initialBranchCoverage: coverageReport.branchCoveragePercentage,
      initialLineCoverage: coverageReport.coveragePercentage,
      totalFiles: coverageReport.totalFiles,
      filesWithLowBranchCoverage: coverageReport.uncoveredFiles.length,
      llmModel: this.getLLMModelName(),
    };
  }

  private async saveResults(analysis: GapAnalysis): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const modelName = analysis.llmModel.replace(/[^a-zA-Z0-9-_]/g, "-");

    // Salvar JSON
    const jsonFileName = `${analysis.repositoryName}_${modelName}_${timestamp}.json`;
    const jsonFilePath = path.join(config.dataPath.reports, jsonFileName);
    await FileSystemUtils.writeJSON(jsonFilePath, analysis);
    logger.info(`💾 Resultados salvos: ${jsonFilePath}`);

    // Salvar logs em TXT
    const logsContent = logCollector.getLogsAsString();
    const txtFileName = `${analysis.repositoryName}_${modelName}_${timestamp}.txt`;
    const txtFilePath = path.join(config.dataPath.reports, txtFileName);
    await FileSystemUtils.writeFile(txtFilePath, logsContent);
    logger.info(`💾 Logs salvos: ${txtFilePath}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
