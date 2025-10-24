import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import { config } from "../config";
import { CoverageReport, LLMResponse } from "../types";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt";
import { buildAnalysisPrompt } from "../prompts/analysisPrompt";

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

      const prompt = buildAnalysisPrompt(coverageReport);
      const systemPrompt = SYSTEM_PROMPT;

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
