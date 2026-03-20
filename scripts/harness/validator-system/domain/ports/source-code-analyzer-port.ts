/**
 * @layer domain
 * @unit validator-system
 *
 * SourceCodeAnalyzerPort — AST解析結果取得（L4-001, L4-003）
 */

export interface SourceAnalysisResult {
  readonly unitName: string;
  readonly filePath: string;
  readonly exports: readonly { name: string; type: 'class' | 'interface' | 'type' | 'function' | 'const' }[];
  readonly imports: readonly { source: string; name: string }[];
}

export interface SourceCodeAnalyzerPort {
  analyzeExports(targetUnits?: readonly string[]): Promise<readonly SourceAnalysisResult[]>;
  /** DriftDetectionService用: 要素名一覧取得 */
  getElements?(targetUnits?: readonly string[]): Promise<string[]>;
}
