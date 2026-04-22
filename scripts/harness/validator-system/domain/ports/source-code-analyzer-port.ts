// @unit validator-system
// @layer domain

export interface SourceAnalysisResult {
  readonly unitName: string;
  readonly filePath: string;
  readonly exports: readonly { name: string; type: 'class' | 'interface' | 'type' | 'function' | 'const' }[];
  readonly imports: readonly { source: string; name: string }[];
}

export interface SourceCodeAnalyzerPort {
  analyzeExports(targetUnits?: readonly string[]): Promise<readonly SourceAnalysisResult[]>;
  getElements?(targetUnits?: readonly string[]): Promise<string[]>;
}
