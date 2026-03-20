/**
 * @layer domain
 * @unit agent-integration
 */

export interface ImportAnalysisResult {
  filePath: string;
  agentApiImports: string[];
}

export interface ImportAnalyzerPort {
  analyzeAgentApiImports(targetFilePaths: string[]): Promise<ImportAnalysisResult[]>;
}
