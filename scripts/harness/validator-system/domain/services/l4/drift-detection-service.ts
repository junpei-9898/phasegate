/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-117
 *
 * DriftDetectionService ドメインサービス
 * 設計文書（domain_model.md等）とソースコード実装の双方向乖離検出（L4-001）
 */
import { DriftReport } from '../../value-objects/drift-report.js';

export interface DriftDetectionDesignDocumentPort {
  getElements(targetUnits?: readonly string[]): Promise<string[]>;
  getElementRecords?(targetUnits?: readonly string[]): Promise<readonly DriftElementRecord[]>;
  /**
   * WI-095: 設計要素 → 実装ファイル path の明示対応。
   * 実装されていれば element 名完全一致に加えて drift 判定に使う。
   */
  getElementPointers?(targetUnits?: readonly string[]): Promise<Record<string, readonly string[]>>;
  /**
   * ISSUE-005 P3-9: element → unit 名のマップ。
   * 実装されていれば DriftReport.unitName の解決に使われる (fallback: 'unknown')。
   */
  getElementUnitMap?(targetUnits?: readonly string[]): Promise<Record<string, string>>;
}

export interface DriftDetectionSourceCodeAnalyzerPort {
  getElements(targetUnits?: readonly string[]): Promise<string[]>;
  getElementRecords?(targetUnits?: readonly string[]): Promise<readonly DriftElementRecord[]>;
  /**
   * WI-095: export element → 定義ファイル path のマップ。
   * 実装されていれば design pointer と照合する。
   */
  getElementFilePathMap?(targetUnits?: readonly string[]): Promise<Record<string, readonly string[]>>;
  /**
   * ISSUE-005 P3-9: element → unit 名のマップ。
   * 実装されていれば DriftReport.unitName の解決に使われる (fallback: 'unknown')。
   */
  getElementUnitMap?(targetUnits?: readonly string[]): Promise<Record<string, string>>;
}

export interface DriftDetectionServiceDeps {
  designDocumentPort: DriftDetectionDesignDocumentPort;
  sourceCodeAnalyzerPort: DriftDetectionSourceCodeAnalyzerPort;
}

export interface DriftElementRecord {
  readonly element: string;
  readonly unitName: string;
  readonly filePaths?: readonly string[];
  readonly pointers?: readonly string[];
}

export class DriftDetectionService {
  private readonly designDocumentPort: DriftDetectionDesignDocumentPort;
  private readonly sourceCodeAnalyzerPort: DriftDetectionSourceCodeAnalyzerPort;

  constructor(deps: DriftDetectionServiceDeps) {
    this.designDocumentPort = deps.designDocumentPort;
    this.sourceCodeAnalyzerPort = deps.sourceCodeAnalyzerPort;
  }

  async detect(targetUnits?: readonly string[]): Promise<readonly DriftReport[]> {
    const designRecords = await this.loadDesignRecords(targetUnits);
    const codeRecords = await this.loadCodeRecords(targetUnits);

    const designKeys = new Set(designRecords.map(toDriftKey));
    const codeKeys = new Set(codeRecords.map(toDriftKey));
    const pointerMatchedDesignKeys = new Set<string>();
    const pointerMatchedCodeKeys = new Set<string>();

    for (const designRecord of designRecords) {
      const pointers = designRecord.pointers ?? [];
      if (pointers.length === 0) continue;

      const matchingCodeRecords = codeRecords.filter((codeRecord) =>
        codeRecord.unitName === designRecord.unitName &&
        (codeRecord.filePaths ?? []).some((filePath) => pointers.some((pointer) => isSameOrNestedPath(filePath, pointer)))
      );

      if (matchingCodeRecords.length === 0) continue;

      pointerMatchedDesignKeys.add(toDriftKey(designRecord));

      // WI-117: pointer は同一ファイル内の全 export を blanket match しない。
      // 明示 pointer が名前変更の橋渡しとして使えるのは、当該ファイルの public export が 1 つだけの場合に限定する。
      if (matchingCodeRecords.length === 1) {
        pointerMatchedCodeKeys.add(toDriftKey(matchingCodeRecords[0]));
      } else {
        for (const codeRecord of matchingCodeRecords) {
          if (codeRecord.element === designRecord.element) {
            pointerMatchedCodeKeys.add(toDriftKey(codeRecord));
          }
        }
      }
    }

    const reports: DriftReport[] = [];

    for (const designRecord of designRecords) {
      const key = toDriftKey(designRecord);
      if (!codeKeys.has(key) && !pointerMatchedDesignKeys.has(key)) {
        reports.push(
          DriftReport.create({
            direction: 'design→code',
            unitName: designRecord.unitName,
            element: designRecord.element,
            description: `設計に存在するがコードに存在しない: ${designRecord.element}`,
            recommendation: `${designRecord.element} をコードに実装してください`,
          })
        );
      }
    }

    for (const codeRecord of codeRecords) {
      const key = toDriftKey(codeRecord);
      if (!designKeys.has(key) && !pointerMatchedCodeKeys.has(key)) {
        reports.push(
          DriftReport.create({
            direction: 'code→design',
            unitName: codeRecord.unitName,
            element: codeRecord.element,
            description: `コードに存在するが設計に存在しない: ${codeRecord.element}`,
            recommendation: `${codeRecord.element} を設計文書に追記するか、コードから削除してください`,
          })
        );
      }
    }

    return reports.sort((a, b) =>
      a.direction.localeCompare(b.direction) ||
      a.unitName.localeCompare(b.unitName) ||
      a.element.localeCompare(b.element)
    );
  }

  private async loadDesignRecords(targetUnits?: readonly string[]): Promise<readonly DriftElementRecord[]> {
    if (this.designDocumentPort.getElementRecords) {
      return this.designDocumentPort.getElementRecords(targetUnits);
    }

    const designElements = await this.designDocumentPort.getElements(targetUnits);
    const designPointers = this.designDocumentPort.getElementPointers
      ? await this.designDocumentPort.getElementPointers(targetUnits)
      : {};
    const designUnitMap = this.designDocumentPort.getElementUnitMap
      ? await this.designDocumentPort.getElementUnitMap(targetUnits)
      : {};

    return designElements.map((element) => ({
      element,
      unitName: designUnitMap[element] ?? targetUnits?.[0] ?? 'unknown',
      pointers: designPointers[element] ?? [],
    }));
  }

  private async loadCodeRecords(targetUnits?: readonly string[]): Promise<readonly DriftElementRecord[]> {
    if (this.sourceCodeAnalyzerPort.getElementRecords) {
      return this.sourceCodeAnalyzerPort.getElementRecords(targetUnits);
    }

    const codeElements = await this.sourceCodeAnalyzerPort.getElements(targetUnits);
    const codeFilePathMap = this.sourceCodeAnalyzerPort.getElementFilePathMap
      ? await this.sourceCodeAnalyzerPort.getElementFilePathMap(targetUnits)
      : {};
    const codeUnitMap = this.sourceCodeAnalyzerPort.getElementUnitMap
      ? await this.sourceCodeAnalyzerPort.getElementUnitMap(targetUnits)
      : {};

    return codeElements.map((element) => ({
      element,
      unitName: codeUnitMap[element] ?? targetUnits?.[0] ?? 'unknown',
      filePaths: codeFilePathMap[element] ?? [],
    }));
  }
}

function toDriftKey(record: DriftElementRecord): string {
  return `${record.unitName}\0${record.element}`;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function isSameOrNestedPath(actualPath: string, pointerPath: string): boolean {
  const actual = normalizePath(actualPath);
  const pointer = normalizePath(pointerPath);
  return actual === pointer || actual.endsWith(`/${pointer}`);
}
