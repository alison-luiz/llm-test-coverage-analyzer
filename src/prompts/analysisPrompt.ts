import { CoverageReport } from "../types";

export function buildAnalysisPrompt(report: CoverageReport): string {
  const filesInfo = report.uncoveredFiles
    .slice(0, 5)
    .map((file, idx) => {
      const branchDetails =
        file.detailedBranches && file.detailedBranches.length > 0
          ? file.detailedBranches
              .map(
                (b) =>
                  `  - Linha ${b.line}: tipo '${b.type}' - ${b.uncoveredBranches.length} de ${b.totalBranches} branches não cobertos`
              )
              .join("\n")
          : "  Informação detalhada não disponível";

      return `
═══════════════════════════════════════════════════════════════
ARQUIVO ${idx + 1}: ${file.filePath.split("/").pop() || file.filePath}
═══════════════════════════════════════════════════════════════

📊 MÉTRICAS:
Branch Coverage: ${file.branchCoverage?.toFixed(1)}% (${file.coveredBranches}/${
        file.totalBranches
      } branches cobertos)
${
  file.uncoveredLines.length > 0
    ? `Linhas não cobertas: ${file.uncoveredLines.slice(0, 10).join(", ")}${
        file.uncoveredLines.length > 10 ? "..." : ""
      }`
    : "Todas as linhas estão cobertas"
}

🔀 BRANCHES NÃO COBERTOS:
${branchDetails}

📝 CÓDIGO FONTE COMPLETO:
\`\`\`javascript
${file.sourceCode || "Código não disponível"}
\`\`\`

🧪 TESTES EXISTENTES:
${
  file.testCode
    ? `\`\`\`javascript\n${file.testCode.substring(0, 3000)}\n\`\`\``
    : "⚠️ NENHUM TESTE ENCONTRADO - Este é um problema crítico!"
}

`;
    })
    .join("\n");

  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    RELATÓRIO DE ANÁLISE DE BRANCH COVERAGE                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

📊 VISÃO GERAL DO REPOSITÓRIO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Repositório: ${report.repositoryName}
Cobertura de Linhas: ${report.coveragePercentage}%
Total de Linhas: ${report.totalLines} (${report.coveredLines} cobertas)
Arquivos com Branch Coverage < 90%: ${report.uncoveredFiles.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${filesInfo}

╔═══════════════════════════════════════════════════════════════════════════════╗
║                           INSTRUÇÕES PARA ANÁLISE                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Para CADA arquivo acima, você DEVE:

1️⃣ IDENTIFICAR OS BRANCHES ESPECÍFICOS NÃO COBERTOS
   - Analise o código e identifique exatamente quais if/else, switch, ternários não estão testados
   - Use as informações de "BRANCHES NÃO COBERTOS" como guia
   - Cite linha e tipo de branch (ex: "linha 45: else do if não coberto")

2️⃣ ANALISAR OS TESTES EXISTENTES
   - Veja o que JÁ está sendo testado
   - Identifique por que os branches não cobertos não são atingidos
   - Note inputs/cenários que faltam

3️⃣ SUGERIR TESTES ESPECÍFICOS
   - Para cada branch não coberto, sugira UM teste específico
   - Inclua: input, expected output, qual branch será coberto
   - Seja MUITO específico (não genérico)

4️⃣ PRIORIZAR POR RISCO
   - CRITICAL: error handling, security, data corruption
   - HIGH: validações importantes, edge cases críticos
   - MEDIUM: paths alternativos relevantes
   - LOW: branches de otimização/performance

⚠️ ATENÇÃO: Analise APENAS os ${report.uncoveredFiles.length} arquivos listados acima. Não invente problemas.

Responda AGORA em JSON com análise detalhada e acionável.`;
}
