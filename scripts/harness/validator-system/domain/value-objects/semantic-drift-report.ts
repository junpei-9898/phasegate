/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-139
 */

export type SemanticDriftKind =
  | 'design-behavior-missing-code'
  | 'design-behavior-missing-test'
  | 'code-behavior-missing-design'
  | 'code-behavior-missing-test'
  | 'test-observation-missing-design';

export interface SemanticDriftReportProps {
  readonly kind: SemanticDriftKind;
  readonly behaviorId: string;
  readonly unitName: string;
  readonly severity: 'warning' | 'error';
  readonly location?: string;
  readonly nextAction: string;
}

export class SemanticDriftReport {
  readonly kind: SemanticDriftKind;
  readonly behaviorId: string;
  readonly unitName: string;
  readonly severity: 'warning' | 'error';
  readonly location: string | null;
  readonly nextAction: string;

  private constructor(props: SemanticDriftReportProps) {
    this.kind = props.kind;
    this.behaviorId = props.behaviorId;
    this.unitName = props.unitName;
    this.severity = props.severity;
    this.location = props.location ?? null;
    this.nextAction = props.nextAction;
    Object.freeze(this);
  }

  static create(props: SemanticDriftReportProps): SemanticDriftReport {
    if (props.behaviorId.trim().length === 0) {
      throw new Error('behaviorId is required for semantic drift reports');
    }
    if (props.unitName.trim().length === 0) {
      throw new Error('unitName is required for semantic drift reports');
    }
    return new SemanticDriftReport(props);
  }
}
