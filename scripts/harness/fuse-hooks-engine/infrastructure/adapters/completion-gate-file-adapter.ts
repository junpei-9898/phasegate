/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CompletionGate } from '../../domain/entities/completion-gate.js';
import type { CompletionGatePort } from '../../domain/ports/completion-gate-port.js';
import { MagicFile } from '../../domain/value-objects/magic-file.js';

interface StoredGate {
  storyId: string;
  magicFilePath: string;
  requiredFields: string[];
  status: 'pending' | 'checking' | 'passed' | 'failed';
  checkedAt: string | null;
  failureReason: string | null;
}

export class CompletionGateFileAdapter implements CompletionGatePort {
  constructor(private readonly baseDir: string) {}

  private get statePath(): string {
    return path.join(this.baseDir, '.harness', 'completion-state.json');
  }

  private async readState(): Promise<Record<string, StoredGate>> {
    try {
      const raw = await fs.readFile(this.statePath, 'utf8');
      return JSON.parse(raw) as Record<string, StoredGate>;
    } catch {
      return {};
    }
  }

  async load(storyId: string): Promise<CompletionGate | null> {
    const state = await this.readState();
    const gate = state[storyId];
    if (!gate) {
      return null;
    }
    const magicFile = MagicFile.create(gate.magicFilePath, gate.requiredFields)._unsafeUnwrap();
    return CompletionGate.restore({
      storyId: gate.storyId,
      magicFile,
      status: gate.status,
      checkedAt: gate.checkedAt,
      failureReason: gate.failureReason,
    });
  }

  async save(gate: CompletionGate): Promise<void> {
    const state = await this.readState();
    state[gate.storyId] = {
      storyId: gate.storyId,
      magicFilePath: gate.magicFile.filePath,
      requiredFields: [...gate.magicFile.requiredFields],
      status: gate.status,
      checkedAt: gate.checkedAt,
      failureReason: gate.failureReason,
    };
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
    await fs.writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  async evaluateMagicFile(gate: CompletionGate): Promise<{ passed: boolean; failureReason: string | null }> {
    try {
      const filePath = path.join(this.baseDir, gate.magicFile.filePath);
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const missingField = gate.magicFile.requiredFields.find((field) => !(field in parsed));
      if (missingField) {
        return { passed: false, failureReason: `Missing required field: ${missingField}` };
      }
      return { passed: true, failureReason: null };
    } catch {
      return { passed: false, failureReason: 'Magic file not found' };
    }
  }
}
