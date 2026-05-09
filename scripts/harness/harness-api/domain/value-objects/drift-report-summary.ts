// @layer domain
// @unit harness-api
// drift-report-summary.ts — DriftReportSummary Value Object

export interface DriftItem {
  direction: string;
  unit: string;
  element: string;
  recommendation: string;
}

type DriftCategory =
  | 'code-missing-design'
  | 'design-missing-code'
  | 'missing-pointer'
  | 'design-granularity-mismatch'
  | 'uncategorized';
type DriftSeverity = 'info' | 'warning' | 'error';

export interface ActionableDriftItem extends DriftItem {
  category: DriftCategory;
  severity: DriftSeverity;
  nextAction: string;
}

export interface DriftCategorySummary {
  category: DriftCategory;
  severity: DriftSeverity;
  count: number;
  nextAction: string;
}

export interface DriftReportSummaryProps {
  drifts: readonly DriftItem[];
  totalCount: number;
  sampleLimit?: number;
}

const DEFAULT_SAMPLE_LIMIT = 20;

function classifyDrift(drift: DriftItem): { category: DriftCategory; severity: DriftSeverity; nextAction: string } {
  const direction = drift.direction.toLowerCase();
  const recommendation = drift.recommendation.toLowerCase();
  const element = drift.element.toLowerCase();

  if (recommendation.includes('pointer') || recommendation.includes('@work-item-id')) {
    return {
      category: 'missing-pointer',
      severity: 'warning',
      nextAction: 'Add or repair the traceability pointer before changing gating policy.',
    };
  }
  if (element.includes('heading') || recommendation.includes('granularity')) {
    return {
      category: 'design-granularity-mismatch',
      severity: 'info',
      nextAction: 'Review the design granularity or baseline this class of advisory drift.',
    };
  }
  if (direction.includes('code') && direction.includes('design')) {
    return {
      category: direction.indexOf('code') < direction.indexOf('design') ? 'code-missing-design' : 'design-missing-code',
      severity: 'warning',
      nextAction:
        direction.indexOf('code') < direction.indexOf('design')
          ? 'Update the matching product/construction docs with the implementation contract.'
          : 'Implement the described design element or remove stale design text.',
    };
  }
  return {
    category: 'uncategorized',
    severity: 'warning',
    nextAction: 'Inspect the sampled drift and assign a narrower category or baseline rule.',
  };
}

function enrichDrift(drift: DriftItem): ActionableDriftItem {
  return { ...drift, ...classifyDrift(drift) };
}

function summarizeByCategory(drifts: readonly ActionableDriftItem[]): readonly DriftCategorySummary[] {
  const byCategory = new Map<DriftCategory, DriftCategorySummary>();
  for (const drift of drifts) {
    const existing = byCategory.get(drift.category);
    if (existing) {
      byCategory.set(drift.category, { ...existing, count: existing.count + 1 });
    } else {
      byCategory.set(drift.category, {
        category: drift.category,
        severity: drift.severity,
        count: 1,
        nextAction: drift.nextAction,
      });
    }
  }
  return [...byCategory.values()].sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export class DriftReportSummary {
  readonly drifts: readonly ActionableDriftItem[];
  readonly totalCount: number;
  readonly rawDriftCount: number;
  readonly sampleLimit: number;
  readonly truncated: boolean;
  readonly categorySummaries: readonly DriftCategorySummary[];
  readonly actionPlan: readonly DriftCategorySummary[];

  private constructor(
    drifts: readonly DriftItem[],
    totalCount: number,
    sampleLimit: number = DEFAULT_SAMPLE_LIMIT,
    summarySource: readonly DriftItem[] = drifts,
  ) {
    const enriched = drifts.map(enrichDrift);
    const enrichedSummarySource = summarySource.map(enrichDrift);
    this.drifts = Object.freeze(enriched);
    this.totalCount = totalCount;
    this.rawDriftCount = totalCount;
    this.sampleLimit = sampleLimit;
    this.truncated = totalCount > enriched.length;
    this.categorySummaries = Object.freeze(summarizeByCategory(enrichedSummarySource));
    this.actionPlan = Object.freeze(this.categorySummaries.slice(0, 5));
    Object.freeze(this);
  }

  static create(props: DriftReportSummaryProps): DriftReportSummary {
    // INV-7: totalCount === drifts.length
    if (props.totalCount !== props.drifts.length) {
      throw new Error(
        `HarnessApiDomainError: totalCount=${props.totalCount} does not match drifts.length=${props.drifts.length} (INV-7)`
      );
    }
    return new DriftReportSummary(props.drifts, props.totalCount, props.sampleLimit);
  }

  static fromDrifts(drifts: readonly DriftItem[], sampleLimit: number = DEFAULT_SAMPLE_LIMIT): DriftReportSummary {
    return new DriftReportSummary(drifts.slice(0, sampleLimit), drifts.length, sampleLimit, drifts);
  }

  hasDrift(): boolean {
    return this.totalCount > 0;
  }

  filterByUnit(unitId: string): readonly ActionableDriftItem[] {
    return this.drifts.filter((d) => d.unit === unitId);
  }
}
