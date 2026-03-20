/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import { appendFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { PhaseAuditLoggerPort } from '../../domain/ports/phase-audit-logger-port.js';

export interface PhaseOverrideAuditLoggerDeps {
  readonly outputDir: string;
}

const AUDIT_FILE_NAME = 'phase-override-audit.jsonl';

export class PhaseOverrideAuditLogger implements PhaseAuditLoggerPort {
  private readonly outputDir: string;

  constructor(deps: PhaseOverrideAuditLoggerDeps) {
    this.outputDir = deps.outputDir;
  }

  async record(payload: {
    scope: { unitId?: string; storyId?: string };
    targetLevel: 1 | 2 | 3;
    appliedRules: readonly string[];
    generatedAt: string;
    requestedOverride: boolean;
  }): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });

    const filePath = path.join(this.outputDir, AUDIT_FILE_NAME);
    const line = JSON.stringify(payload) + '\n';

    await appendFile(filePath, line, 'utf8');
  }
}
