// @unit validator-system
// @layer domain
// @work-item-id WI-132 / WI-133 / WI-136 / WI-137 / WI-138

export type PublicContractKind =
  | 'cli-command'
  | 'api-endpoint'
  | 'port'
  | 'config-option'
  | 'domain-behavior'
  | 'error-code';

export type BoundaryCaseKind =
  | 'empty-input'
  | 'missing-required'
  | 'invalid-enum'
  | 'duplicate-id'
  | 'unknown-reference'
  | 'permission-denied'
  | 'config-disabled'
  | 'partial-failure'
  | 'idempotency'
  | 'backward-compatibility';

export interface PublicContract {
  readonly id: string;
  readonly kind: PublicContractKind;
  readonly sourcePath: string;
  readonly requiredBehaviors: readonly string[];
  readonly boundaryCases?: readonly BoundaryCaseKind[];
}

export interface TestObservation {
  readonly id: string;
  readonly kind: 'unit' | 'integration' | 'e2e' | 'adapter-contract';
  readonly sourcePath: string;
  readonly covers: readonly string[];
}

export interface ErrorContract {
  readonly id: string;
  readonly sourcePath: string;
  readonly code?: string;
  readonly severity?: 'error' | 'warning';
  readonly message?: string;
  readonly suggestion?: string;
  readonly documentationRef?: string;
  readonly exitCode?: number;
  readonly machineFields?: readonly string[];
}

export interface StateTransition {
  readonly from: string;
  readonly to: string;
  readonly guard?: string;
}

export interface StateMachineModel {
  readonly id: string;
  readonly sourcePath: string;
  readonly docsStates: readonly string[];
  readonly codeStates: readonly string[];
  readonly transitions: readonly StateTransition[];
  readonly terminalStates: readonly string[];
  readonly invalidTransitions: readonly StateTransition[];
}

export interface TraceabilityGraphSlice {
  readonly workItemId: string;
  readonly affectedUnits: readonly string[];
  readonly productUnits: readonly string[];
  readonly implementationWorkItemIds: readonly string[];
  readonly testWorkItemIds: readonly string[];
  readonly publicDocsChanged: boolean;
  readonly contractChanged: boolean;
}

export interface ContractTraceabilityInput {
  readonly publicContracts: readonly PublicContract[];
  readonly testObservations: readonly TestObservation[];
  readonly errorContracts: readonly ErrorContract[];
  readonly stateMachines: readonly StateMachineModel[];
  readonly traceabilitySlices: readonly TraceabilityGraphSlice[];
}

export type ContractTraceabilityFindingKind =
  | 'missing-required-behavior-test'
  | 'missing-port-contract-test'
  | 'missing-boundary-test'
  | 'error-contract-shape'
  | 'error-contract-exit-code'
  | 'missing-error-path-test'
  | 'state-doc-code-mismatch'
  | 'state-invalid-terminal-transition'
  | 'missing-transition-test'
  | 'traceability-unit-mismatch'
  | 'traceability-test-mismatch'
  | 'public-doc-contract-sync';

export interface ContractTraceabilityFinding {
  readonly kind: ContractTraceabilityFindingKind;
  readonly severity: 'error' | 'warning';
  readonly subject: string;
  readonly sourcePath: string;
  readonly message: string;
  readonly suggestion: string;
}

export class ContractTraceabilityReport {
  readonly findings: readonly ContractTraceabilityFinding[];

  private constructor(findings: readonly ContractTraceabilityFinding[]) {
    this.findings = Object.freeze([...findings]);
    Object.freeze(this);
  }

  static create(findings: readonly ContractTraceabilityFinding[]): ContractTraceabilityReport {
    return new ContractTraceabilityReport(findings);
  }

  hasFindings(): boolean {
    return this.findings.length > 0;
  }
}
