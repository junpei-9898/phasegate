/**
 * @layer domain
 * @unit validator-system
 *
 * SourceAnalysisPort — biome-ast-engine ImportGraph相当データ（L4-003）
 */

export interface ImportGraphData {
  readonly nodes: readonly { filePath: string; exports: readonly string[] }[];
  readonly edges: readonly { from: string; to: string; importedNames: readonly string[] }[];
  /** DeadCodeDetectionService用: 未使用エクスポート・到達不能コード */
  readonly unusedExports?: readonly string[];
  readonly unreachableCode?: readonly { filePath: string; range: { startLine: number; endLine: number } }[];
}

export interface SourceAnalysisPort {
  getImportGraph(): Promise<ImportGraphData>;
}
