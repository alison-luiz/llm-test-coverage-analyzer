import { execSync } from "child_process";
import path from "path";
import { logger } from "../utils/logger";
import { FileSystemUtils } from "../utils/fileSystem";
import { CoverageReport, UncoveredFile } from "../types";

export class CoverageService {
  async runCoverage(projectPath: string): Promise<CoverageReport> {
    try {
      logger.info(`Executando cobertura em: ${projectPath}`);

      // Verificar se tem package.json
      const packageJsonPath = path.join(projectPath, "package.json");
      const hasPackageJson = await FileSystemUtils.fileExists(packageJsonPath);

      if (!hasPackageJson) {
        throw new Error("package.json não encontrado");
      }

      // Instalar dependências
      logger.info("Instalando dependências...");
      const installationStartTime = Date.now();
      try {
        execSync("npm install", { cwd: projectPath, stdio: "inherit" });
      } catch (error) {
        logger.warn("npm install falhou, tentando com --legacy-peer-deps...");
        execSync("npm install --legacy-peer-deps", {
          cwd: projectPath,
          stdio: "inherit",
        });
      }
      const installationTime = Date.now() - installationStartTime;
      logger.info(
        `⏱️  Instalação concluída em ${(installationTime / 1000).toFixed(2)}s`
      );

      // Executar testes com cobertura
      logger.info("Executando testes...");
      const testStartTime = Date.now();
      try {
        execSync("npm test -- --coverage --coverageReporters=json", {
          cwd: projectPath,
          stdio: "inherit",
        });
      } catch (error) {
        logger.warn("Testes falharam, mas continuando análise de cobertura");
      }
      const testTime = Date.now() - testStartTime;
      logger.info(`⏱️  Testes concluídos em ${(testTime / 1000).toFixed(2)}s`);

      // Verificar se tem NYC e gerar relatório JSON
      const nycOutputPath = path.join(projectPath, ".nyc_output");
      const hasNycOutput = await FileSystemUtils.fileExists(nycOutputPath);

      if (hasNycOutput) {
        logger.info("Detectado NYC, gerando relatório JSON...");
        try {
          execSync("npx nyc report --reporter=json", {
            cwd: projectPath,
            stdio: "inherit",
          });
        } catch (error) {
          logger.warn("Falha ao gerar relatório NYC");
        }
      }

      // Ler relatório de cobertura (Jest ou NYC)
      const coveragePath = path.join(
        projectPath,
        "coverage",
        "coverage-final.json"
      );
      const coverageExists = await FileSystemUtils.fileExists(coveragePath);

      if (!coverageExists) {
        throw new Error("Relatório de cobertura não encontrado");
      }

      const coverageData = await FileSystemUtils.readJSON(coveragePath);
      const report = this.parseCoverageReport(coverageData, projectPath);

      // Adicionar tempos ao relatório
      report.installationTime = installationTime;
      report.testTime = testTime;

      // Exibir relatório visual
      this.displayCoverageReport(report);

      return report;
    } catch (error: any) {
      logger.error("Erro ao executar cobertura", error);

      // Melhorar mensagem de erro
      if (error.message?.includes("package.json não encontrado")) {
        throw new Error(
          "O projeto não possui package.json - não é um projeto Node.js válido"
        );
      }
      if (error.message?.includes("Relatório de cobertura não encontrado")) {
        throw new Error(
          "Testes executados mas relatório de cobertura não foi gerado. Verifique se o projeto tem Jest configurado."
        );
      }

      throw error;
    }
  }

  private parseCoverageReport(
    coverageData: any,
    projectPath: string
  ): CoverageReport {
    const filesWithLowCoverage: UncoveredFile[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFiles = 0;

    for (const [filePath, fileData] of Object.entries(coverageData)) {
      const data = fileData as any;
      totalFiles++;

      // Estatísticas de linhas
      const statements = data.s || {};
      const lines = Object.values(statements) as number[];

      totalLines += lines.length;
      coveredLines += lines.filter((count: number) => count > 0).length;

      // Calcular branch coverage
      const branchCoverage = this.calculateBranchCoverage(data.b || {});

      // Acumular branch coverage total
      totalBranches += branchCoverage.total;
      coveredBranches += branchCoverage.covered;

      // Filtrar arquivos com branch coverage < 90%
      if (branchCoverage.percentage < 90) {
        // Linhas não cobertas
        const uncoveredLines = Object.entries(statements)
          .filter(([_, count]) => (count as number) === 0)
          .map(([line, _]) => parseInt(line));

        // Extrair branches detalhados não cobertos
        const detailedBranches = this.extractDetailedBranches(
          data.b || {},
          data.branchMap || {}
        );

        filesWithLowCoverage.push({
          filePath: filePath,
          uncoveredLines,
          uncoveredBranches: this.parseUncoveredBranches(data.b || {}),
          branchCoverage: branchCoverage.percentage,
          totalBranches: branchCoverage.total,
          coveredBranches: branchCoverage.covered,
          detailedBranches,
        });
      }
    }

    // Ordenar por pior branch coverage primeiro
    filesWithLowCoverage.sort(
      (a, b) => (a.branchCoverage || 100) - (b.branchCoverage || 100)
    );

    const coveragePercentage =
      totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

    const branchCoveragePercentage =
      totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100;

    return {
      repositoryName: path.basename(projectPath),
      totalLines,
      coveredLines,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      branchCoveragePercentage:
        Math.round(branchCoveragePercentage * 100) / 100,
      totalFiles,
      uncoveredFiles: filesWithLowCoverage,
      timestamp: new Date(),
    };
  }

  private calculateBranchCoverage(branches: any): {
    total: number;
    covered: number;
    percentage: number;
  } {
    const allBranches = Object.values(branches).flat() as number[];
    const total = allBranches.length;

    if (total === 0) {
      return { total: 0, covered: 0, percentage: 100 };
    }

    const covered = allBranches.filter((count) => count > 0).length;
    const percentage = (covered / total) * 100;

    return { total, covered, percentage };
  }

  private extractDetailedBranches(
    branches: any,
    branchMap: any
  ): Array<{
    line: number;
    type: string;
    uncoveredBranches: number[];
    totalBranches: number;
  }> {
    const detailed = [];

    for (const [branchId, branchData] of Object.entries(branches)) {
      const data = branchData as number[];
      const uncoveredIndices = data
        .map((count, idx) => (count === 0 ? idx : -1))
        .filter((idx) => idx !== -1);

      if (uncoveredIndices.length > 0) {
        const branchInfo = branchMap[branchId];
        if (branchInfo) {
          detailed.push({
            line: branchInfo.line || 0,
            type: branchInfo.type || "unknown",
            uncoveredBranches: uncoveredIndices,
            totalBranches: data.length,
          });
        }
      }
    }

    return detailed;
  }

  private parseUncoveredBranches(branches: any): any[] {
    const uncovered = [];

    for (const [line, branchData] of Object.entries(branches)) {
      const data = branchData as number[];
      if (data.some((count) => count === 0)) {
        uncovered.push({
          line: parseInt(line),
          covered: false,
        });
      }
    }

    return uncovered;
  }

  async extractCodeSnippets(
    projectPath: string,
    uncoveredFiles: UncoveredFile[]
  ): Promise<UncoveredFile[]> {
    const filesWithCode: UncoveredFile[] = [];

    for (const file of uncoveredFiles) {
      try {
        // Se o filePath já é absoluto, usar como está
        const fullPath = path.isAbsolute(file.filePath)
          ? file.filePath
          : path.join(projectPath, file.filePath);
        const sourceCode = await FileSystemUtils.readFile(fullPath);

        // Buscar arquivo de teste correspondente
        const testCode = await this.findTestFile(fullPath, projectPath);

        filesWithCode.push({
          ...file,
          sourceCode,
          testCode,
        });
      } catch (error) {
        logger.warn(`Não foi possível ler arquivo: ${file.filePath}`);
        filesWithCode.push(file);
      }
    }

    return filesWithCode;
  }

  private async findTestFile(
    sourceFilePath: string,
    projectPath: string
  ): Promise<string | undefined> {
    const fileName = path.basename(
      sourceFilePath,
      path.extname(sourceFilePath)
    );
    const dir = path.dirname(sourceFilePath);

    // Possíveis padrões de teste
    const testPatterns = [
      path.join(dir, "__test__", `${fileName}.test.js`),
      path.join(dir, "__tests__", `${fileName}.test.js`),
      path.join(dir, "test.js"),
      path.join(dir, `${fileName}.test.js`),
      path.join(dir, `${fileName}.spec.js`),
    ];

    for (const testPath of testPatterns) {
      try {
        if (await FileSystemUtils.fileExists(testPath)) {
          return await FileSystemUtils.readFile(testPath);
        }
      } catch (error) {
        // Continuar tentando outros padrões
      }
    }

    return undefined;
  }

  private displayCoverageReport(report: CoverageReport): void {
    console.log("\n" + "=".repeat(70));
    console.log("📊 RELATÓRIO DE COBERTURA");
    console.log("=".repeat(70));
    console.log(`📁 Repositório: ${report.repositoryName}`);
    console.log(`📈 Line Coverage: ${report.coveragePercentage.toFixed(2)}%`);
    console.log(
      `🔀 Branch Coverage: ${report.branchCoveragePercentage.toFixed(2)}%`
    );
    console.log(`📝 Total de Linhas: ${report.totalLines}`);
    console.log(`✅ Linhas Cobertas: ${report.coveredLines}`);
    console.log(
      `❌ Linhas Não Cobertas: ${report.totalLines - report.coveredLines}`
    );
    console.log(`📄 Total de Arquivos: ${report.totalFiles}`);
    console.log(
      `⚠️  Arquivos com Branch Coverage < 90%: ${report.uncoveredFiles.length}`
    );
    console.log("=".repeat(70));

    if (report.uncoveredFiles.length > 0) {
      console.log("\n🔍 ARQUIVOS COM BAIXO BRANCH COVERAGE (<90%):\n");

      report.uncoveredFiles.slice(0, 10).forEach((file, idx) => {
        const branchPercentage = file.branchCoverage?.toFixed(1) || "N/A";
        const fileName = path.basename(file.filePath);
        const relativePath = file.filePath.replace(process.cwd(), ".");

        console.log(`${idx + 1}. ${fileName}`);
        console.log(`   📁 ${relativePath}`);
        console.log(
          `   🔀 Branch Coverage: ${branchPercentage}% (${file.coveredBranches}/${file.totalBranches})`
        );

        if (file.uncoveredLines.length > 0) {
          const sampleLines = file.uncoveredLines.slice(0, 5);
          console.log(
            `   📍 ${
              file.uncoveredLines.length
            } linha(s) não coberta(s): ${sampleLines.join(", ")}${
              file.uncoveredLines.length > 5 ? "..." : ""
            }`
          );
        }

        console.log("");
      });

      if (report.uncoveredFiles.length > 10) {
        console.log(
          `   ... e mais ${report.uncoveredFiles.length - 10} arquivos\n`
        );
      }
    } else {
      console.log("\n✅ Todos os arquivos têm branch coverage >= 90%! 🎉\n");
    }

    console.log("=".repeat(70) + "\n");
  }
}
