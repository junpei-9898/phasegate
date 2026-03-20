/**
 * @layer presentation
 * @unit harness-error
 *
 * HarnessErrorContract をAIエージェント向け構造化データに変換するフォーマッター
 */
import type { HarnessErrorContract } from '../../application/dto/harness-error-contract.js';

export interface AgentErrorFormatterOutput {
  readonly json: string;
}

export interface AgentErrorPayload {
  readonly errors: readonly AgentErrorEntry[];
  readonly summary: {
    readonly total: number;
    readonly errorCount: number;
    readonly warningCount: number;
  };
}

export interface AgentErrorEntry {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly adr_ref?: string;
  readonly fix_example?: string;
}

export class AgentErrorFormatter {
  format(errors: readonly HarnessErrorContract[]): AgentErrorFormatterOutput {
    const payload: AgentErrorPayload = {
      errors: errors.map((e) => {
        const entry: AgentErrorEntry = {
          code: e.code,
          severity: e.severity,
          message: e.message,
          suggestion: e.suggestion,
          ...(e.adr_ref !== undefined ? { adr_ref: e.adr_ref } : {}),
          ...(e.fix_example !== undefined ? { fix_example: e.fix_example } : {}),
        };
        return entry;
      }),
      summary: {
        total: errors.length,
        errorCount: errors.filter((e) => e.severity === 'error').length,
        warningCount: errors.filter((e) => e.severity === 'warning').length,
      },
    };

    return { json: JSON.stringify(payload, null, 2) };
  }
}
