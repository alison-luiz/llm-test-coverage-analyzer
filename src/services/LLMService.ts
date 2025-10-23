import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import { config } from "../config";
import { CoverageReport, LLMResponse, Gap, PrioritizedGap } from "../types";

export class LLMService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor() {
    if (config.llmProvider === "openai") {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    } else if (config.llmProvider === "anthropic") {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }
  }

  async analyzeGaps(coverageReport: CoverageReport): Promise<LLMResponse> {
    try {
      logger.info("Analisando gaps com LLM...");

      if (coverageReport.uncoveredFiles.length === 0) {
        logger.info("✅ Nenhum gap de cobertura encontrado!");
        return {
          analysis:
            "Parabéns! O projeto possui 100% de cobertura de código. Não há gaps a serem analisados.",
          identifiedGaps: [],
          prioritization: [],
          recommendations: [
            "Manter a cobertura alta com testes contínuos.",
            "Considerar mutation testing para validar a qualidade dos testes.",
          ],
        };
      }

      this.displaySelectedFiles(coverageReport);

      const prompt = this.buildAnalysisPrompt(coverageReport);
      const systemPrompt = this.getSystemPrompt();

      let content: string | null = null;

      if (config.llmProvider === "openai" && this.openai) {
        logger.info("🤖 Chamando OpenAI API...");
        const response = await this.openai.chat.completions.create({
          model: config.openaiModel,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
        });

        content = response.choices[0].message.content;
        logger.info("✅ Resposta recebida da OpenAI");
      } else if (config.llmProvider === "anthropic" && this.anthropic) {
        logger.info("🤖 Chamando Anthropic API...");

        try {
          const response = await this.anthropic.messages.create({
            model: config.anthropicModel,
            max_tokens: 8192, // Aumentar limite para respostas maiores
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content:
                  prompt +
                  "\n\n⚠️ IMPORTANTE: Responda APENAS em formato JSON válido, sem texto adicional antes ou depois do JSON.",
              },
            ],
          });

          logger.info(
            `✅ Resposta recebida da Anthropic. Stop reason: ${response.stop_reason}`
          );

          // Verificar se há conteúdo
          if (!response.content || response.content.length === 0) {
            throw new Error("Resposta da Anthropic não contém conteúdo");
          }

          const block = response.content[0];
          if (block.type === "text") {
            content = block.text;
            logger.info(`📝 Conteúdo extraído (${content.length} caracteres)`);
          } else {
            throw new Error(`Tipo de bloco inesperado: ${block.type}`);
          }
        } catch (anthropicError: any) {
          logger.error("❌ Erro específico da Anthropic:", {
            message: anthropicError.message,
            status: anthropicError.status,
            type: anthropicError.type,
            error: anthropicError.error,
          });
          throw anthropicError;
        }
      } else {
        throw new Error(
          `Provider LLM não configurado corretamente: ${config.llmProvider}`
        );
      }

      if (!content) {
        throw new Error("Resposta vazia do LLM");
      }

      // Tentar extrair JSON se vier com texto extra
      logger.info("🔍 Parseando resposta JSON...");
      let parsed;
      try {
        // Tentar extrair JSON se vier cercado por markdown
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          logger.info(
            "📦 JSON encontrado dentro de bloco markdown, extraindo..."
          );
          content = jsonMatch[1];
        }

        parsed = JSON.parse(content);
        logger.info("✅ JSON parseado com sucesso");
      } catch (parseError: any) {
        logger.error("❌ Erro ao parsear JSON:", {
          error: parseError.message,
          contentPreview: content.substring(0, 500),
        });
        throw new Error(`Erro ao parsear resposta JSON: ${parseError.message}`);
      }

      logger.info("✅ Análise concluída com sucesso");

      return this.formatLLMResponse(parsed);
    } catch (error: any) {
      logger.error("❌ Erro ao analisar com LLM:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  private getSystemPrompt(): string {
    return `Você é um ESPECIALISTA SÊNIOR em Engenharia de Testes de Software, com vasta experiência em:
- Análise de cobertura de código (branch, line, function coverage)
- Identificação de edge cases e cenários não testados
- Testes de caminhos alternativos (if/else, switch, loops)
- Testes de condições booleanas complexas (&&, ||, operador ternário)
- Análise de qualidade de suites de testes

CONTEXTO DA ANÁLISE:
Você receberá arquivos com BAIXO BRANCH COVERAGE (<90%), junto com:
1. O código-fonte do arquivo
2. Os testes existentes (quando disponíveis)
3. Métricas de branch coverage (ex: 80% = 4/5 branches cobertos)
4. Detalhes sobre quais branches/condições NÃO estão cobertos

SUA MISSÃO:
Analisar PROFUNDAMENTE cada arquivo e identificar EXATAMENTE:
1. Quais branches/condições específicas não estão sendo testadas
2. Por que esses branches são importantes (edge cases, validações, error handling)
3. Como os testes atuais estão falhando em cobrir esses cenários
4. Quais casos de teste ESPECÍFICOS devem ser adicionados

INSTRUÇÕES CRÍTICAS:
✅ FAÇA:
- Analise o CÓDIGO FONTE para entender a lógica e identificar branches
- Compare com os TESTES EXISTENTES para ver o que está faltando
- Identifique if/else não testados, retornos antecipados, validações de borda
- Sugira casos de teste ESPECÍFICOS com inputs e outputs esperados
- Priorize por RISCO (critical > high > medium > low)

❌ NÃO FAÇA:
- NÃO invente problemas genéricos
- NÃO sugira testes para código já 100% coberto
- NÃO seja vago ("adicione mais testes")
- NÃO ignore os testes existentes fornecidos

ESTRUTURA DA RESPOSTA (JSON):
{
  "analysis": "Análise geral do estado da cobertura e padrões identificados",
  "identifiedGaps": [
    {
      "file": "nome do arquivo",
      "lines": [números das linhas com branches não cobertos],
      "description": "Descrição ESPECÍFICA do branch não coberto (ex: 'else do if(x > 0) na linha 45')",
      "codeSnippet": "trecho do código relevante"
    }
  ],
  "prioritization": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "reasoning": "Por que este gap é desta prioridade (considere: error handling, edge cases, data corruption, security)",
      "suggestedTests": [
        "Teste ESPECÍFICO 1: Input X deve retornar Y para cobrir branch Z",
        "Teste ESPECÍFICO 2: Quando condição W, esperar comportamento Q"
      ]
    }
  ],
  "recommendations": [
    "Recomendações PRÁTICAS e ACIONÁVEIS para melhorar a cobertura",
    "Sugestões de refatoração se o código dificulta testes"
  ]
}

SEJA PRECISO, TÉCNICO E ACIONÁVEL. Cada sugestão deve poder ser implementada imediatamente.`;
  }

  private buildAnalysisPrompt(report: CoverageReport): string {
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

  private extractRelevantCode(
    sourceCode: string,
    uncoveredLines: number[]
  ): string {
    const lines = sourceCode.split("\n");
    const relevantLines: string[] = [];

    uncoveredLines.forEach((lineNum) => {
      const start = Math.max(0, lineNum - 3);
      const end = Math.min(lines.length, lineNum + 3);

      for (let i = start; i < end; i++) {
        const marker = uncoveredLines.includes(i + 1) ? ">>> " : "    ";
        relevantLines.push(`${marker}${i + 1}: ${lines[i]}`);
      }
      relevantLines.push("");
    });

    return relevantLines.join("\n");
  }

  private formatLLMResponse(parsed: any): LLMResponse {
    return {
      analysis: parsed.analysis || "",
      identifiedGaps: parsed.identifiedGaps || [],
      prioritization: parsed.prioritization || [],
      recommendations: parsed.recommendations || [],
    };
  }

  private displaySelectedFiles(report: CoverageReport): void {
    const filesToAnalyze = report.uncoveredFiles.slice(0, 5);
    const totalFiles = report.uncoveredFiles.length;

    console.log("\n" + "=".repeat(70));
    console.log("🤖 ENVIANDO PARA ANÁLISE DO LLM");
    console.log("=".repeat(70));
    console.log(
      `📊 Total de arquivos com branch coverage < 90%: ${totalFiles}`
    );
    console.log(
      `📤 Enviando para análise: ${filesToAnalyze.length} arquivo(s)`
    );

    if (totalFiles > 5) {
      console.log(
        `⚠️  Limitado a 5 arquivos para não exceder o limite de tokens`
      );
    }

    console.log("\n📁 ARQUIVOS SELECIONADOS:\n");

    filesToAnalyze.forEach((file, idx) => {
      const branchPercentage = file.branchCoverage?.toFixed(1) || "N/A";
      const testStatus = file.testCode
        ? "✅ Teste encontrado"
        : "❌ Teste não encontrado";

      console.log(`${idx + 1}. ${file.filePath}`);
      console.log(
        `   🔀 Branch Coverage: ${branchPercentage}% (${file.coveredBranches}/${file.totalBranches})`
      );
      console.log(`   🧪 ${testStatus}`);
    });

    console.log("\n" + "=".repeat(70));
    console.log("⏳ Aguardando resposta do LLM...\n");
  }
}
