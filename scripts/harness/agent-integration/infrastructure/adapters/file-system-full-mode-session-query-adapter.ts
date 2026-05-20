// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-206

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type {
  FullModeSessionQueryInput,
  FullModeSessionQueryPort,
  FullModeSessionQueryResult,
} from '../../domain/ports/full-mode-session-query-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import { WriteTargetScope } from '../../domain/value-objects/write-target-scope.js';

interface FullModeSessionDocument {
  readonly mode?: unknown;
  readonly unit?: unknown;
  readonly workItemId?: unknown;
  readonly allowedCategories?: unknown;
  readonly reason?: unknown;
  readonly startedAt?: unknown;
  readonly expiresAt?: unknown;
}

export class FileSystemFullModeSessionQueryAdapter implements FullModeSessionQueryPort {
  constructor(
    private readonly options: {
      readonly rootDir: string;
      readonly configQueryPort: ConfigQueryPort;
      readonly now?: () => Date;
    },
  ) {}

  async check(input: FullModeSessionQueryInput): Promise<FullModeSessionQueryResult> {
    let document: FullModeSessionDocument;
    try {
      const raw = await fs.readFile(path.join(this.options.rootDir, '.phasegate', 'session.json'), 'utf8');
      document = JSON.parse(raw) as FullModeSessionDocument;
    } catch {
      return { active: false, allowed: false, reason: 'session marker not found or unreadable' };
    }

    if (document.mode !== 'full') {
      return { active: false, allowed: false, reason: 'session mode is not full' };
    }
    if (typeof document.unit !== 'string' || document.unit === '') {
      return { active: true, allowed: false, reason: 'session unit is missing' };
    }
    if (typeof document.workItemId !== 'string' || !/^WI-\d+$/.test(document.workItemId)) {
      return { active: true, allowed: false, reason: 'session work item is invalid' };
    }
    if (typeof document.expiresAt !== 'string' || Number.isNaN(Date.parse(document.expiresAt))) {
      return { active: true, allowed: false, reason: 'session expiry is invalid' };
    }
    if ((this.options.now?.() ?? new Date()).getTime() >= Date.parse(document.expiresAt)) {
      return {
        active: true,
        allowed: false,
        reason: 'session expired',
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }
    if (!Array.isArray(document.allowedCategories) || document.allowedCategories.some((value) => typeof value !== 'string')) {
      return { active: true, allowed: false, reason: 'session allowedCategories is invalid' };
    }
    if (input.dominantCategory === undefined || !document.allowedCategories.includes(input.dominantCategory)) {
      return {
        active: true,
        allowed: false,
        reason: `category ${input.dominantCategory ?? '<unknown>'} is not allowed by session`,
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }
    if (input.unitId === undefined || input.unitId !== document.unit) {
      return {
        active: true,
        allowed: false,
        reason: `target unit ${input.unitId ?? '<unknown>'} does not match session unit ${document.unit}`,
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }
    if (!this.allTargetPathsBelongToUnit(input.targetFilePaths, document.unit)) {
      return {
        active: true,
        allowed: false,
        reason: `one or more target paths are outside session unit ${document.unit}`,
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }

    return {
      active: true,
      allowed: true,
      workItemId: document.workItemId,
      unit: document.unit,
      expiresAt: document.expiresAt,
    };
  }

  private allTargetPathsBelongToUnit(targetFilePaths: readonly string[], unit: string): boolean {
    const projectPaths = this.options.configQueryPort.getProjectPaths();
    for (const targetFilePath of targetFilePaths) {
      const scope = WriteTargetScope.fromPath(targetFilePath, projectPaths);
      if (scope?.unitId !== undefined && scope.unitId !== unit) {
        return false;
      }
    }
    return true;
  }
}
