// @unit validator-system
// @layer domain
// @work-item-id WI-129
// @work-item-id WI-130

export type TestCaseKind = 'unit' | 'integration' | 'e2e' | 'lifecycle';

export type TestStepKind = 'arrange' | 'act' | 'assert';

export type AssertionTarget =
  | 'observed-output'
  | 'state'
  | 'emitted-event'
  | 'persisted-effect'
  | 'error-contract'
  | 'interaction';

export type AssertionStrength =
  | 'exact-value'
  | 'shape'
  | 'invariant'
  | 'range'
  | 'weak-truthiness'
  | 'snapshot-only'
  | 'interaction-only'
  | 'length-only';

export interface SemanticAssertion {
  readonly target: AssertionTarget;
  readonly strength: AssertionStrength;
  readonly subject: string;
  readonly line: number;
}

export interface TestStep {
  readonly kind: TestStepKind;
  readonly expression: string;
  readonly line: number;
  readonly observedName?: string;
  readonly assertion?: SemanticAssertion;
}

export interface TestDoubleReplacement {
  readonly target: string;
  readonly line: number;
  readonly dependencyKind: 'external' | 'domain-internal';
}

export interface TestCaseStructure {
  readonly filePath: string;
  readonly name: string;
  readonly line: number;
  readonly kind: TestCaseKind;
  readonly steps: readonly TestStep[];
  readonly assertions: readonly SemanticAssertion[];
  readonly mocks: readonly TestDoubleReplacement[];
  readonly allowsMultipleActs: boolean;
}
