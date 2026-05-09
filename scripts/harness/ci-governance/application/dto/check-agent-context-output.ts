/**
 * @layer application
 * @unit ci-governance
 */

export interface AgentContextFreshnessFinding {
  readonly path: string;
  readonly status: 'pass' | 'error';
  readonly ageInDays: number | null;
  readonly message: string;
}

export interface CheckAgentContextOutput {
  readonly passed: boolean;
  readonly thresholdDays: number;
  readonly findings: readonly AgentContextFreshnessFinding[];
}
