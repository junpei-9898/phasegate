/**
 * @layer domain
 * @unit validator-system
 *
 * DriftReport 値オブジェクト
 * 設計文書とコード実装の双方向乖離検出結果VO（L4-001専用）
 */
import type { HarnessErrorLike } from './validation-result.js';

export type DriftDirection = 'design→code' | 'code→design';

export interface DriftReportProps {
  readonly direction: DriftDirection;
  readonly unitName: string;
  readonly element: string;
  readonly description?: string;
  readonly recommendation?: string;
  readonly location?: { designDoc?: string; sourceFile?: string };
}

export class DriftReport {
  readonly direction: DriftDirection;
  readonly unitName: string;
  readonly element: string;
  readonly recommendation: string;
  readonly location: { readonly designDoc?: string; readonly sourceFile?: string };

  private constructor(props: DriftReportProps) {
    this.direction = props.direction;
    this.unitName = props.unitName;
    this.element = props.element;
    this.recommendation = props.recommendation ?? (props.description ?? '');
    this.location = Object.freeze(props.location ?? {});
    Object.freeze(this);
  }

  static create(props: DriftReportProps): DriftReport {
    if (props.direction !== 'design→code' && props.direction !== 'code→design') {
      throw new Error(`Invalid DriftReport direction: "${props.direction}". Must be "design→code" or "code→design" (INV-10)`);
    }
    return new DriftReport(props);
  }

  toHarnessError(): HarnessErrorLike {
    // ADR-017 / WI-094: error catalog の defaultSeverity: warning と整合
    return {
      code: { value: 'L4-001', toString: () => 'L4-001' },
      severity: { value: 'warning', toString: () => 'warning' },
      message: `乖離検出 [${this.direction}] Unit: ${this.unitName}, Element: ${this.element}`,
      suggestion: this.recommendation,
    };
  }

  equals(other: DriftReport): boolean {
    return (
      this.direction === other.direction &&
      this.unitName === other.unitName &&
      this.element === other.element &&
      this.recommendation === other.recommendation
    );
  }
}
