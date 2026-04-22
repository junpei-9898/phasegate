// @unit validator-system
// @layer domain

export interface ImportGraphData {
  readonly nodes: readonly { filePath: string; exports: readonly string[] }[];
  readonly edges: readonly { from: string; to: string; importedNames: readonly string[] }[];
  readonly unusedExports?: readonly string[];
  readonly unreachableCode?: readonly { filePath: string; range: { startLine: number; endLine: number } }[];
}

export interface SourceAnalysisPort {
  getImportGraph(): Promise<ImportGraphData>;
}
