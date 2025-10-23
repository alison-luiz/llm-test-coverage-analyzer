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
  uncoveredFiles: UncoveredFile[];
  timestamp: Date;
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
