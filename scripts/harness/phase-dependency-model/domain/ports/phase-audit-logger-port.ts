/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface PhaseAuditLoggerPort {
  record(payload: {
    scope: { unitId?: string; storyId?: string };
    targetLevel: 1 | 2 | 3;
    appliedRules: readonly string[];
    generatedAt: string;
    requestedOverride: boolean;
  }): Promise<void>;
}
