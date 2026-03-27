/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { CompletionGate } from '../../domain/entities/completion-gate.js';
import type { CompletionGatePort } from '../../domain/ports/completion-gate-port.js';
import { MagicFile } from '../../domain/value-objects/magic-file.js';

const execAsync = promisify(exec);

interface StoredGate {
  storyId: string;
  magicFilePath: string;
  requiredFields: string[];
  status: 'pending' | 'checking' | 'passed' | 'failed';
  checkedAt: string | null;
  failureReason: string | null;
}

export interface TestRunResult {
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CommandEntry {
  name: string;
  description: string;
}

export interface CompletionGateFileAdapterOptions {
  testCommand?: string;
  requireTestPass?: boolean;
}

export class CompletionGateFileAdapter implements CompletionGatePort {
  private readonly testCommand: string;
  private readonly requireTestPass: boolean;

  constructor(
    private readonly baseDir: string,
    options?: CompletionGateFileAdapterOptions,
  ) {
    this.testCommand = options?.testCommand ?? 'pnpm test';
    this.requireTestPass = options?.requireTestPass ?? false;
  }

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
    } catch {
      return { passed: false, failureReason: 'Magic file not found' };
    }

    if (this.requireTestPass) {
      const testResult = await this.runTests();
      if (!testResult.passed) {
        return { passed: false, failureReason: `Tests did not pass (exit code: ${testResult.exitCode})` };
      }
    }

    return { passed: true, failureReason: null };
  }

  async runTests(): Promise<TestRunResult> {
    try {
      const result = await execAsync(this.testCommand, {
        cwd: this.baseDir,
        timeout: 120_000,
        shell: '/bin/sh',
      });
      return {
        passed: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
      };
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string; code?: number };
      return {
        passed: false,
        stdout: failure.stdout ?? '',
        stderr: failure.stderr ?? '',
        exitCode: typeof failure.code === 'number' ? failure.code : 1,
      };
    }
  }

  getCommandEntry(): CommandEntry {
    return {
      name: 'harness:complete',
      description: 'Check completion gate: verify magic file and run tests before marking story as done',
    };
  }
}
