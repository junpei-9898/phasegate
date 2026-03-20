/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { PhaseAuditLoggerPort } from '../../domain/ports/phase-audit-logger-port.js';

export class AuditLogWriteError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'AuditLogWriteError';
    this.cause = cause;
  }
}

export interface RecordPhaseOverrideAuditInput {
  readonly scope: { unitId?: string; storyId?: string };
  readonly targetLevel: 1 | 2 | 3;
  readonly appliedRules: readonly string[];
  readonly requestedOverride: boolean;
}

export interface RecordPhaseOverrideAuditUseCaseDeps {
  readonly auditLogger: PhaseAuditLoggerPort;
}

export class RecordPhaseOverrideAuditUseCase {
  private readonly auditLogger: PhaseAuditLoggerPort;

  constructor(deps: RecordPhaseOverrideAuditUseCaseDeps) {
    this.auditLogger = deps.auditLogger;
  }

  async execute(input: RecordPhaseOverrideAuditInput): Promise<void> {
    if (!input.requestedOverride || input.appliedRules.length === 0) {
      return;
    }

    try {
      await this.auditLogger.record({
        scope: input.scope,
        targetLevel: input.targetLevel,
        appliedRules: Object.freeze([...input.appliedRules]),
        generatedAt: new Date().toISOString(),
        requestedOverride: input.requestedOverride,
      });
    } catch (error) {
      throw new AuditLogWriteError('監査ログの書き込みに失敗しました', error);
    }
  }
}
