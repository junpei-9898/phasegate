/**
 * @layer application
 * @unit ci-governance
 */

import type { AgentContextDocumentPort } from '../../domain/ports/agent-context-document-port.js';
import type { CheckAgentContextInput } from '../dto/check-agent-context-input.js';
import type { AgentContextFreshnessFinding, CheckAgentContextOutput } from '../dto/check-agent-context-output.js';

const AGENT_CONTEXT_PATHS = ['AGENTS.md', 'CLAUDE.md'] as const;
const DEFAULT_THRESHOLD_DAYS = 30;

export class CheckAgentContextUseCase {
  constructor(private readonly documentPort: AgentContextDocumentPort) {}

  async execute(input: CheckAgentContextInput): Promise<CheckAgentContextOutput> {
    const thresholdDays = input.thresholdDays ?? DEFAULT_THRESHOLD_DAYS;
    const findings: AgentContextFreshnessFinding[] = [];

    for (const path of AGENT_CONTEXT_PATHS) {
      const stat = await this.documentPort.statProjectFile(path);
      if (!stat.exists) {
        findings.push({
          path,
          status: 'error',
          ageInDays: null,
          message: `${path} does not exist`,
        });
        continue;
      }
      const stale = stat.ageInDays !== null && stat.ageInDays > thresholdDays;
      findings.push({
        path,
        status: stale ? 'error' : 'pass',
        ageInDays: stat.ageInDays,
        message: stale
          ? `${path} is older than ${thresholdDays} days`
          : `${path} is fresh`,
      });
    }

    return {
      passed: findings.every((finding) => finding.status === 'pass'),
      thresholdDays,
      findings,
    };
  }
}
