/**
 * @layer infrastructure
 * @unit validator-system
 *
 * JsonCoverageReportAdapter — CoverageReportPort実装
 */
import type { CoverageReportPort } from '../../domain/ports/coverage-report-port.js';
import { readFile } from 'node:fs/promises';

export class CoverageReportNotFoundError extends Error {
  constructor(path: string) {
    super(`Coverage report not found: ${path}`);
    this.name = 'CoverageReportNotFoundError';
  }
}

export class JsonCoverageReportAdapter implements CoverageReportPort {
  private readonly reportPath: string;

  constructor(reportPath: string) {
    this.reportPath = reportPath;
  }

  async getCoverage(): Promise<{
    overallCoverage: number;
    perFileCoverage: readonly { filePath: string; coverage: number }[];
  }> {
    let raw: string;
    try {
      raw = await readFile(this.reportPath, 'utf-8');
    } catch {
      throw new CoverageReportNotFoundError(this.reportPath);
    }

    const data = JSON.parse(raw) as Record<string, { lines?: { pct?: number } }>;
    const total = data['total'];
    const overallCoverage = total?.lines?.pct ?? 0;

    const perFileCoverage: { filePath: string; coverage: number }[] = [];
    for (const [filePath, fileData] of Object.entries(data)) {
      if (filePath === 'total') continue;
      perFileCoverage.push({
        filePath,
        coverage: fileData?.lines?.pct ?? 0,
      });
    }

    return { overallCoverage, perFileCoverage };
  }
}
