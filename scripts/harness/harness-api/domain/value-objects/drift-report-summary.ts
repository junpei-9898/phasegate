// @layer domain
// drift-report-summary.ts — DriftReportSummary Value Object

export interface DriftItem {
  direction: string;
  unit: string;
  element: string;
  recommendation: string;
}

export interface DriftReportSummaryProps {
  drifts: readonly DriftItem[];
  totalCount: number;
}

export class DriftReportSummary {
  readonly drifts: readonly DriftItem[];
  readonly totalCount: number;

  private constructor(drifts: readonly DriftItem[], totalCount: number) {
    this.drifts = Object.freeze([...drifts]);
    this.totalCount = totalCount;
    Object.freeze(this);
  }

  static create(props: DriftReportSummaryProps): DriftReportSummary {
    // INV-7: totalCount === drifts.length
    if (props.totalCount !== props.drifts.length) {
      throw new Error(
        `HarnessApiDomainError: totalCount=${props.totalCount} does not match drifts.length=${props.drifts.length} (INV-7)`
      );
    }
    return new DriftReportSummary(props.drifts, props.totalCount);
  }

  static fromDrifts(drifts: readonly DriftItem[]): DriftReportSummary {
    return new DriftReportSummary(drifts, drifts.length);
  }

  hasDrift(): boolean {
    return this.drifts.length > 0;
  }

  filterByUnit(unitId: string): readonly DriftItem[] {
    return this.drifts.filter((d) => d.unit === unitId);
  }
}
