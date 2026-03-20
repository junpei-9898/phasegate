/**
 * @layer domain
 * @unit validator-system
 *
 * CoverageReportPort — テストカバレッジレポート取得（L3-003）
 */

export interface CoverageReportPort {
  getCoverage(): Promise<{
    overallCoverage: number;
    perFileCoverage: readonly { filePath: string; coverage: number }[];
  }>;
}
