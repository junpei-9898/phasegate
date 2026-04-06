// @layer domain
export interface ImportAnalyzerPort {
  analyzeImports(targetModule: string): Promise<string[]>;
}
