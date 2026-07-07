// @unit ci-governance
// @layer infrastructure

import type { CommandExistencePort } from '../../domain/ports/command-existence-port.js';

const KNOWN_HARNESS_COMMANDS: readonly string[] = [
  'baseline',
  'bypass:audit',
  'check-change-category',
  'check-phase-gate',
  'ci-check',
  'ci:auto-refresh-agent-context',
  'ci:check-repetition',
  'ci:generate-template',
  'ci:migrate-agents-md',
  'commit-msg',
  'complete-check',
  'config:plan',
  'delegate-sonnet',
  'disable-feature',
  'doctor',
  'emit-agent-rules',
  'enable-feature',
  'hook',
  'init',
  'install',
  'lint',
  'list-adrs',
  'list-errors',
  'list-features',
  'migrate',
  'p2:check-agent-context',
  'p2:check-freshness',
  'p2:check-initial-creation',
  'p2:generate-e2e-template',
  'p2:validate-pointers',
  'phasegate:attest',
  'phasegate:check-phase',
  'phasegate:check-ready',
  'phasegate:ci-check',
  'phasegate:complete-check',
  'phasegate:detect-drift',
  'phasegate:generate-matrix',
  'phasegate:impact-analysis',
  'phasegate:lint',
  'phasegate:status',
  'phasegate:verify-attestation',
  'pre-commit',
  'reconcile',
  'refresh-claude-md',
  'regression:analyze-migration',
  'regression:configure-ci-gate',
  'regression:migrate-v0-tests',
  'regression:run-agent-guard',
  'regression:run-gng-gate',
  'regression:run-k-requirements',
  'regression:run-k14-k15',
  'render-errors',
  'scaffold-design',
  'scaffold-wi',
  'session',
  'setup:agent',
  'skill:apply-cascade-update',
  'skill:check-coverage',
  'skill:collect-lessons',
  'skill:execute-tdd-cycle',
  'skill:validate-structure',
  'skills',
  'status',
  'uninstall',
  'update-skills',
  'validate',
  'validate-adr',
  'validate-fix',
  'validate-metadata',
  'work-items:status',
];

export class HarnessApiCommandExistenceAdapter implements CommandExistencePort {
  private readonly knownCommands: Set<string>;

  constructor(knownCommands: string[] = [...KNOWN_HARNESS_COMMANDS]) {
    this.knownCommands = new Set(knownCommands);
  }

  async exists(command: string): Promise<boolean> {
    return this.knownCommands.has(command);
  }
}
