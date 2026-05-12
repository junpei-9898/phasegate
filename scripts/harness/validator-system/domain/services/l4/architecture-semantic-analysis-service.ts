/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-134, WI-135
 *
 * ArchitectureSemanticAnalysisService
 * Architecture preset の capability / decision policy と source semantic signal を照合する advisory service.
 */
import type { HarnessErrorLike } from '../../value-objects/validation-result.js';

export type EffectCapability =
  | 'filesystem'
  | 'network'
  | 'database'
  | 'process-env'
  | 'time'
  | 'random'
  | 'subprocess'
  | 'user-io';

export type DecisionSignal =
  | 'business-rule-branch'
  | 'validation-rule'
  | 'error-construction'
  | 'state-transition'
  | 'policy-selection';

export interface ArchitectureCapabilityPolicy {
  readonly allowed: readonly EffectCapability[];
  readonly denied: readonly EffectCapability[];
}

export interface ArchitectureDecisionPolicy {
  readonly expected: readonly DecisionSignal[];
  readonly advisoryOnly: boolean;
}

export interface ArchitectureSemanticPolicy {
  readonly capabilityPolicies: Readonly<Record<string, ArchitectureCapabilityPolicy>>;
  readonly decisionPolicies: Readonly<Record<string, ArchitectureDecisionPolicy>>;
}

export interface SourceSemanticSignal {
  readonly kind: EffectCapability | DecisionSignal;
  readonly evidence: string;
  readonly confidence: number;
}

export interface SourceSemanticFile {
  readonly filePath: string;
  readonly zone: string;
  readonly effects: readonly SourceSemanticSignal[];
  readonly decisions: readonly SourceSemanticSignal[];
}

export interface ArchitectureSemanticSourcePort {
  collectSourceSemantics(): Promise<readonly SourceSemanticFile[]>;
}

export interface ArchitectureSemanticAnalysisServiceDeps {
  readonly sourcePort: ArchitectureSemanticSourcePort;
  readonly policy: ArchitectureSemanticPolicy;
}

const DEFAULT_DECISION_OWNER: Readonly<Record<DecisionSignal, string>> = Object.freeze({
  'business-rule-branch': 'domain',
  'validation-rule': 'domain',
  'error-construction': 'application',
  'state-transition': 'domain',
  'policy-selection': 'application',
});

export class ArchitectureSemanticAnalysisService {
  private readonly sourcePort: ArchitectureSemanticSourcePort;
  private readonly policy: ArchitectureSemanticPolicy;

  constructor(deps: ArchitectureSemanticAnalysisServiceDeps) {
    this.sourcePort = deps.sourcePort;
    this.policy = deps.policy;
  }

  async analyze(): Promise<readonly HarnessErrorLike[]> {
    const files = await this.sourcePort.collectSourceSemantics();
    return files.flatMap((file) => [
      ...this.toCapabilityFindings(file),
      ...this.toDecisionFindings(file),
    ]);
  }

  private toCapabilityFindings(file: SourceSemanticFile): HarnessErrorLike[] {
    const zonePolicy = this.policy.capabilityPolicies[file.zone];
    if (!zonePolicy) return [];
    const denied = new Set(zonePolicy.denied);

    return file.effects
      .filter((effect) => denied.has(effect.kind as EffectCapability))
      .map((effect) => this.toHarnessError(
        `Side effect capability denied: ${effect.kind} in ${file.zone} at ${file.filePath}`,
        `confidence=${effect.confidence}; evidence=${effect.evidence}; suggested owner zone=infrastructure/adapters`,
      ));
  }

  private toDecisionFindings(file: SourceSemanticFile): HarnessErrorLike[] {
    const zonePolicy = this.policy.decisionPolicies[file.zone];
    if (!zonePolicy) return [];
    const expected = new Set(zonePolicy.expected);

    return file.decisions
      .filter((decision) => !expected.has(decision.kind as DecisionSignal))
      .map((decision) => this.toHarnessError(
        `Decision placement advisory: ${decision.kind} observed in ${file.zone} at ${file.filePath}`,
        `confidence=${decision.confidence}; evidence=${decision.evidence}; suggested owner zone=${DEFAULT_DECISION_OWNER[decision.kind as DecisionSignal] ?? 'domain'}; rollout=advisory`,
      ));
  }

  private toHarnessError(message: string, suggestion: string): HarnessErrorLike {
    return {
      code: { value: 'L4-002', toString: () => 'L4-002' },
      severity: { value: 'warning', toString: () => 'warning' },
      message,
      suggestion,
    };
  }
}
