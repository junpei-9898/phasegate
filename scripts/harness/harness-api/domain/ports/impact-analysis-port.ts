// impact-analysis-port.ts

export interface ImpactAnalysisResult {
  storyId: string;
  affectedTestCases: string[];
  affectedFiles: string[];
  [key: string]: unknown;
}

export interface ImpactAnalysisPort {
  analyze(storyId: string): Promise<ImpactAnalysisResult | null>;
}
