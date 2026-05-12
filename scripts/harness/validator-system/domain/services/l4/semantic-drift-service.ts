/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-139
 */
import { SemanticDriftReport } from '../../value-objects/semantic-drift-report.js';

export interface DesignIntent {
  readonly behaviorId: string;
  readonly unitName: string;
  readonly source: string;
}

export interface ImplementationBehavior {
  readonly behaviorId: string;
  readonly unitName: string;
  readonly source: string;
  readonly isPublic: boolean;
}

export interface TestObservation {
  readonly behaviorId: string;
  readonly unitName: string;
  readonly source: string;
}

export interface SemanticDriftInput {
  readonly designIntents: readonly DesignIntent[];
  readonly implementationBehaviors: readonly ImplementationBehavior[];
  readonly testObservations: readonly TestObservation[];
}

export class SemanticDriftService {
  detect(input: SemanticDriftInput): readonly SemanticDriftReport[] {
    const designKeys = new Set(input.designIntents.map(toBehaviorKey));
    const codeKeys = new Set(input.implementationBehaviors.filter((entry) => entry.isPublic).map(toBehaviorKey));
    const testKeys = new Set(input.testObservations.map(toBehaviorKey));
    const reports: SemanticDriftReport[] = [];

    for (const intent of input.designIntents) {
      const key = toBehaviorKey(intent);
      if (!codeKeys.has(key)) {
        reports.push(SemanticDriftReport.create({
          kind: 'design-behavior-missing-code',
          behaviorId: intent.behaviorId,
          unitName: intent.unitName,
          severity: 'error',
          location: intent.source,
          nextAction: 'Implement the designed behavior or remove the design intent',
        }));
      }
      if (!testKeys.has(key)) {
        reports.push(SemanticDriftReport.create({
          kind: 'design-behavior-missing-test',
          behaviorId: intent.behaviorId,
          unitName: intent.unitName,
          severity: 'warning',
          location: intent.source,
          nextAction: 'Add a test observation for the design intent',
        }));
      }
    }

    for (const behavior of input.implementationBehaviors.filter((entry) => entry.isPublic)) {
      const key = toBehaviorKey(behavior);
      if (!designKeys.has(key)) {
        reports.push(SemanticDriftReport.create({
          kind: 'code-behavior-missing-design',
          behaviorId: behavior.behaviorId,
          unitName: behavior.unitName,
          severity: 'warning',
          location: behavior.source,
          nextAction: 'Document the public behavior or make it private/internal',
        }));
      }
      if (!testKeys.has(key)) {
        reports.push(SemanticDriftReport.create({
          kind: 'code-behavior-missing-test',
          behaviorId: behavior.behaviorId,
          unitName: behavior.unitName,
          severity: 'warning',
          location: behavior.source,
          nextAction: 'Add a test observation for the public behavior',
        }));
      }
    }

    for (const observation of input.testObservations) {
      const key = toBehaviorKey(observation);
      if (!designKeys.has(key)) {
        reports.push(SemanticDriftReport.create({
          kind: 'test-observation-missing-design',
          behaviorId: observation.behaviorId,
          unitName: observation.unitName,
          severity: 'warning',
          location: observation.source,
          nextAction: 'Link the test observation to design intent or loosen the test',
        }));
      }
    }

    return reports.sort((a, b) =>
      a.unitName.localeCompare(b.unitName) ||
      a.behaviorId.localeCompare(b.behaviorId) ||
      a.kind.localeCompare(b.kind)
    );
  }
}

function toBehaviorKey(entry: { readonly behaviorId: string; readonly unitName: string }): string {
  return `${entry.unitName}\0${entry.behaviorId}`;
}
