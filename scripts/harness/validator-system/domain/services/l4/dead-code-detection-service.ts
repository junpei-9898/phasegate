/**
 * @layer domain
 * @unit validator-system
 *
 * DeadCodeDetectionService ドメインサービス
 * 未使用エクスポートおよび到達不能コードの検出（L4-003）
 */
import { DeadCodeReport } from '../../value-objects/dead-code-report.js';

export interface DeadCodeSourceAnalysisPort {
  getImportGraph(): Promise<{
    nodes?: readonly { filePath: string; exports: readonly string[]; excludedReason?: string }[];
    edges?: readonly { from: string; to: string; importedNames: readonly string[]; kind?: string }[];
    unusedExports?: readonly string[];
    unreachableCode?: readonly { filePath: string; range: { startLine: number; endLine: number } }[];
  }>;
}

export interface DeadCodeDetectionServiceDeps {
  sourceAnalysisPort: DeadCodeSourceAnalysisPort;
}

export interface DeadCodeDetectOptions {
  strictOnly: boolean;
}

export class DeadCodeDetectionService {
  private readonly sourceAnalysisPort: DeadCodeSourceAnalysisPort;

  constructor(deps: DeadCodeDetectionServiceDeps) {
    this.sourceAnalysisPort = deps.sourceAnalysisPort;
  }

  async detect(options: DeadCodeDetectOptions): Promise<DeadCodeReport> {
    const graph = await this.sourceAnalysisPort.getImportGraph();

    const unusedExports = graph.unusedExports ? [...graph.unusedExports] : [];
    const unreachableCode = graph.unreachableCode ? [...graph.unreachableCode] : [];

    const hasDeadCode = unusedExports.length > 0 || unreachableCode.length > 0;
    const gcRecommended = options.strictOnly && hasDeadCode;

    return DeadCodeReport.create({
      unusedExports,
      unreachableCode,
      gcRecommended,
    });
  }
}
