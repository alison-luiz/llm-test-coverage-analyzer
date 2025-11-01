import { logger } from "./utils/logger";
import { AnalysisOrchestrator } from "./services/AnalysisOrchestrator";
import { GapAnalysis } from "./types";

function displayResults(analysis: GapAnalysis) {
  console.log("\n" + "=".repeat(60));
  console.log(`📊 RESULTADOS: ${analysis.repositoryName}`);
  console.log("=".repeat(60));
  console.log(`🤖 LLM utilizado: ${analysis.llmModel}`);
  console.log(
    `⏱️  Tempo total de execução: ${(analysis.executionTime / 1000).toFixed(
      2
    )}s`
  );
  console.log("\n📊 TEMPOS DETALHADOS:");
  if (analysis.executionTimeDetails.cloneTime > 0) {
    console.log(
      `   📦 Clonagem: ${(
        analysis.executionTimeDetails.cloneTime / 1000
      ).toFixed(2)}s`
    );
  }
  console.log(
    `   📥 Instalação de dependências: ${(
      analysis.executionTimeDetails.installationTime / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `   🧪 Testes: ${(analysis.executionTimeDetails.testTime / 1000).toFixed(
      2
    )}s`
  );
  console.log(
    `   📝 Extração de código: ${(
      analysis.executionTimeDetails.codeExtractionTime / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `   🤖 Análise LLM: ${(
      analysis.executionTimeDetails.llmAnalysisTime / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `📈 Branch coverage inicial: ${analysis.initialBranchCoverage.toFixed(2)}%`
  );
  console.log(
    `📈 Line coverage inicial: ${analysis.initialLineCoverage.toFixed(2)}%`
  );
  console.log(`📄 Total de arquivos: ${analysis.totalFiles}`);
  console.log(
    `⚠️  Arquivos com < 90% branch coverage: ${analysis.filesWithLowBranchCoverage}`
  );
  console.log(`📁 Gaps identificados: ${analysis.gaps.length}`);
  console.log(`⚠️  Gaps priorizados: ${analysis.prioritizedGaps.length}`);
  console.log(`💡 Sugestões: ${analysis.suggestions.length}`);
  console.log("=".repeat(60));

  if (analysis.prioritizedGaps && analysis.prioritizedGaps.length > 0) {
    console.log("\n🔴 TOP 3 GAPS CRÍTICOS:\n");
    analysis.prioritizedGaps.slice(0, 3).forEach((gap, idx) => {
      console.log(`${idx + 1}. [${gap.priority}]`);
      console.log(`   📝 Razão: ${gap.reasoning}`);
      if (gap.suggestedTests && gap.suggestedTests.length > 0) {
        console.log(`   ✅ Testes sugeridos:`);
        gap.suggestedTests.forEach((test) => {
          console.log(`      - ${test}`);
        });
      }
      console.log("");
    });
  }

  if (analysis.suggestions && analysis.suggestions.length > 0) {
    console.log("💡 RECOMENDAÇÕES GERAIS:\n");
    analysis.suggestions.forEach((suggestion, idx) => {
      console.log(`${idx + 1}. ${suggestion}`);
    });
  }

  console.log("\n" + "=".repeat(60));
}

function showHelp() {
  console.log("\n🔬 LLM Test Coverage Analyzer");
  console.log("=".repeat(60));
  console.log("\nUso:");
  console.log("  npm start repo <owner> <repo>");
  console.log("  npm start multiple <language> [minStars] [maxRepos]");
  console.log("  npm start local <caminho>");
  console.log("\nExemplos:");
  console.log("  npm start repo facebook react");
  console.log("  npm start multiple JavaScript 100 3");
  console.log("  npm start local ./meu-projeto");
  console.log("  npm start local data/repositories/javascript-algorithms");
  console.log("\n" + "=".repeat(60));
}

async function analyzeRepo(
  orchestrator: AnalysisOrchestrator,
  owner: string,
  repo: string
) {
  console.log(`\n📦 Analisando ${owner}/${repo}...`);
  const analysis = await orchestrator.analyzeRepository(owner, repo);
  displayResults(analysis);
}

async function analyzeMultiple(
  orchestrator: AnalysisOrchestrator,
  language: string,
  minStars: number,
  maxRepos: number
) {
  console.log(
    `\n🔍 Buscando repositórios de ${language} com mínimo ${minStars} stars...`
  );
  const analyses = await orchestrator.analyzeMultipleRepositories(
    language,
    minStars,
    maxRepos
  );
  console.log(`\n✅ ${analyses.length} repositórios analisados com sucesso!`);
  analyses.forEach((analysis) => displayResults(analysis));
}

async function analyzeLocal(
  orchestrator: AnalysisOrchestrator,
  projectPath: string
) {
  console.log(`\n📂 Analisando projeto local em ${projectPath}...`);
  const analysis = await orchestrator.analyzeLocalProject(projectPath);
  displayResults(analysis);
}

async function main() {
  try {
    logger.info("🚀 LLM Test Coverage Analyzer iniciado\n");

    const orchestrator = new AnalysisOrchestrator();
    const args = process.argv.slice(2);

    if (args.length === 0) {
      showHelp();
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case "repo":
        if (args.length < 3) {
          console.log(
            "❌ Uso: npm start repo <owner> <repo>\nExemplo: npm start repo facebook react"
          );
          process.exit(1);
        }
        await analyzeRepo(orchestrator, args[1], args[2]);
        break;

      case "multiple":
        if (args.length < 2) {
          console.log(
            "❌ Uso: npm start multiple <language> [minStars] [maxRepos]\nExemplo: npm start multiple JavaScript 100 3"
          );
          process.exit(1);
        }
        const language = args[1];
        const minStars = args[2] ? parseInt(args[2]) : 100;
        const maxRepos = args[3] ? parseInt(args[3]) : 3;
        await analyzeMultiple(orchestrator, language, minStars, maxRepos);
        break;

      case "local":
        if (args.length < 2) {
          console.log(
            "❌ Uso: npm start local <caminho>\nExemplo: npm start local ./meu-projeto"
          );
          process.exit(1);
        }
        await analyzeLocal(orchestrator, args[1]);
        break;

      default:
        console.log(`❌ Comando inválido: '${command}'`);
        showHelp();
        process.exit(1);
    }

    logger.info("✅ Análise concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Erro fatal na aplicação", error);
    process.exit(1);
  }
}

// Tratar sinais de interrupção
process.on("SIGINT", () => {
  console.log("\n\n👋 Aplicação interrompida pelo usuário");
  process.exit(0);
});

main();
