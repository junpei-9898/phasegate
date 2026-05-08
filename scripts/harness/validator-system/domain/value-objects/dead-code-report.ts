/**
 * @layer domain
 * @unit validator-system
 *
 * DeadCodeReport 値オブジェクト
 * 未使用エクスポートおよび到達不能コードの検出結果VO（L4-003専用）
 */
import type { HarnessErrorLike } from './validation-result.js';

export interface UnreachableCodeLocation {
  readonly filePath: string;
  readonly range: { readonly startLine: number; readonly endLine: number };
}

export interface DeadCodeReportProps {
  readonly unusedExports: readonly string[];
  readonly unreachableCode: readonly UnreachableCodeLocation[];
  readonly gcRecommended: boolean;
}

export class DeadCodeReport {
  readonly unusedExports: readonly string[];
  readonly unreachableCode: readonly UnreachableCodeLocation[];
  readonly gcRecommended: boolean;

  private constructor(props: DeadCodeReportProps) {
    this.unusedExports = Object.freeze([...props.unusedExports]);
    this.unreachableCode = Object.freeze([...props.unreachableCode]);
    this.gcRecommended = props.gcRecommended;
    Object.freeze(this);
  }

  static create(props: DeadCodeReportProps): DeadCodeReport {
    return new DeadCodeReport(props);
  }

  hasDeadCode(): boolean {
    return this.unusedExports.length > 0 || this.unreachableCode.length > 0;
  }

  // ADR-017 / WI-094: error catalog の defaultSeverity: warning と整合
  toHarnessErrors(): readonly HarnessErrorLike[] {
    const errors: HarnessErrorLike[] = [];
    for (const exportId of this.unusedExports) {
      errors.push({
        code: { value: 'L4-003', toString: () => 'L4-003' },
        severity: { value: 'warning', toString: () => 'warning' },
        message: `未使用エクスポート: ${exportId}`,
        suggestion: '未使用エクスポートを削除するか、他ファイルからimportしてください',
      });
    }
    for (const loc of this.unreachableCode) {
      errors.push({
        code: { value: 'L4-003', toString: () => 'L4-003' },
        severity: { value: 'warning', toString: () => 'warning' },
        message: `到達不能コード: ${loc.filePath}:${loc.range.startLine}-${loc.range.endLine}`,
        suggestion: '到達不能なコードブロックを削除してください',
      });
    }
    return errors;
  }
}
