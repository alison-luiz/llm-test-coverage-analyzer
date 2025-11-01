export interface Repository {
  owner: string;
  name: string;
  url: string;
  language: string;
}

export interface CoverageReport {
  repositoryName: string;
  totalLines: number;
  coveredLines: number;
  coveragePercentage: number;
  branchCoveragePercentage: number;
  totalFiles: number;
  uncoveredFiles: UncoveredFile[];
  timestamp: Date;
  installationTime?: number; // tempo de instalação de dependências em milissegundos
  testTime?: number; // tempo de execução dos testes em milissegundos
}

export interface UncoveredFile {
  filePath: string;
  uncoveredLines: number[];
  uncoveredBranches?: Branch[];
  sourceCode?: string;
  testCode?: string;
  branchCoverage?: number;
  totalBranches?: number;
  coveredBranches?: number;
  detailedBranches?: Array<{
    line: number;
    type: string;
    uncoveredBranches: number[];
    totalBranches: number;
  }>;
}

export interface Branch {
  line: number;
  condition: string;
  covered: boolean;
}

export interface GapAnalysis {
  repositoryName: string;
  gaps: Gap[];
  prioritizedGaps: PrioritizedGap[];
  suggestions: string[];
  analysisDate: Date;
  executionTime: number; // em milissegundos
  executionTimeDetails: {
    cloneTime: number; // tempo de clonagem em milissegundos
    installationTime: number; // tempo de instalação de dependências em milissegundos
    testTime: number; // tempo de execução dos testes em milissegundos
    codeExtractionTime: number; // tempo de extração de snippets em milissegundos
    llmAnalysisTime: number; // tempo de análise com LLM em milissegundos
  };
  initialBranchCoverage: number; // em porcentagem
  initialLineCoverage: number; // em porcentagem
  totalFiles: number;
  filesWithLowBranchCoverage: number; // arquivos com < 90% branch coverage
  llmModel: string; // nome do modelo LLM utilizado (ex: "gpt-4", "claude-sonnet-4")
}

export interface Gap {
  file: string;
  lines: number[];
  description: string;
  codeSnippet: string;
}

export interface PrioritizedGap {
  gap: Gap;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
  suggestedTests: string[];
}

export interface LLMResponse {
  analysis: string;
  identifiedGaps: Gap[];
  prioritization: PrioritizedGap[];
  recommendations: string[];
}
