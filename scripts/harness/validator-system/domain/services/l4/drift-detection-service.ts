/**
 * @layer domain
 * @unit validator-system
 *
 * DriftDetectionService ドメインサービス
 * 設計文書（domain_model.md等）とソースコード実装の双方向乖離検出（L4-001）
 */
import { DriftReport } from '../../value-objects/drift-report.js';

export interface DriftDetectionDesignDocumentPort {
  getElements(targetUnits?: readonly string[]): Promise<string[]>;
}

export interface DriftDetectionSourceCodeAnalyzerPort {
  getElements(targetUnits?: readonly string[]): Promise<string[]>;
}

export interface DriftDetectionServiceDeps {
  designDocumentPort: DriftDetectionDesignDocumentPort;
  sourceCodeAnalyzerPort: DriftDetectionSourceCodeAnalyzerPort;
}

export class DriftDetectionService {
  private readonly designDocumentPort: DriftDetectionDesignDocumentPort;
  private readonly sourceCodeAnalyzerPort: DriftDetectionSourceCodeAnalyzerPort;

  constructor(deps: DriftDetectionServiceDeps) {
    this.designDocumentPort = deps.designDocumentPort;
    this.sourceCodeAnalyzerPort = deps.sourceCodeAnalyzerPort;
  }

  async detect(targetUnits?: readonly string[]): Promise<readonly DriftReport[]> {
    const designElements = await this.designDocumentPort.getElements(targetUnits);
    const codeElements = await this.sourceCodeAnalyzerPort.getElements(targetUnits);

    const designSet = new Set(designElements);
    const codeSet = new Set(codeElements);

    const reports: DriftReport[] = [];

    // 設計に存在するがコードに存在しない
    for (const element of designElements) {
      if (!codeSet.has(element)) {
        reports.push(
          DriftReport.create({
            direction: 'design→code',
            unitName: (targetUnits?.[0]) ?? 'unknown',
            element,
            description: `設計に存在するがコードに存在しない: ${element}`,
            recommendation: `${element} をコードに実装してください`,
          })
        );
      }
    }

    // コードに存在するが設計に存在しない
    for (const element of codeElements) {
      if (!designSet.has(element)) {
        reports.push(
          DriftReport.create({
            direction: 'code→design',
            unitName: (targetUnits?.[0]) ?? 'unknown',
            element,
            description: `コードに存在するが設計に存在しない: ${element}`,
            recommendation: `${element} を設計文書に追記するか、コードから削除してください`,
          })
        );
      }
    }

    return reports.sort((a, b) =>
      a.direction.localeCompare(b.direction) || a.unitName.localeCompare(b.unitName)
    );
  }
}
