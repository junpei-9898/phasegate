// @story H12-07
// @unit skill-quality
// @layer test
// @work-item-id WI-220
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecuteTddCycleUseCase } from '../../../skill-quality/application/usecases/execute-tdd-cycle-usecase.js';
import { AtomicCommitService } from '../../../skill-quality/domain/services/atomic-commit-service.js';
import { GitCommitExecutorAdapter } from '../../../skill-quality/infrastructure/adapters/git-commit-executor-adapter.js';
import { ExecuteTddCycleHandler } from '../../../skill-quality/presentation/handlers/execute-tdd-cycle-handler.js';

const temporaryRepositories: string[] = [];
const repositoryRoot = fileURLToPath(new URL('../../../../../', import.meta.url));

afterEach(async () => {
  await Promise.all(temporaryRepositories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('TDDコミットの追跡情報', () => {
  it('Git hookで拒否された場合はコミットせず原因を返すこと', async () => {
    // Arrange
    const directory = await mkdtemp(join(tmpdir(), 'phasegate-tdd-hook-'));
    temporaryRepositories.push(directory);
    const git = (args: readonly string[]) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git(['init']);
    git(['config', 'user.name', 'Phasegate Test']);
    git(['config', 'user.email', 'phasegate-test@example.invalid']);
    git(['config', 'commit.gpgSign', 'false']);
    // Use a real rejecting hook, never a no-verify or disabled hook path.
    git(['config', 'core.hooksPath', join(directory, '.git', 'hooks')]);
    const hook = join(directory, '.git', 'hooks', 'pre-commit');
    await writeFile(hook, '#!/bin/sh\necho "fixture hook rejected" >&2\nexit 1\n');
    await chmod(hook, 0o755);
    await writeFile(join(directory, 'change.txt'), 'change\n');
    git(['add', 'change.txt']);
    const executor = new GitCommitExecutorAdapter((_file, args) => git(args));
    const validator = { validate: vi.fn().mockResolvedValue([]) };
    const handler = new ExecuteTddCycleHandler(new ExecuteTddCycleUseCase(new AtomicCommitService(executor, validator, validator)));

    // Act
    const actual = await handler.handle({ unit: 'skill-quality', storyId: 'WI-220', description: 'change', phase: 'REFACTOR', passed: true });

    // Assert
    expect(actual.exitCode).toBe(2);
    expect(actual.message).toContain('fixture hook rejected');
    expect(() => git(['rev-parse', '--verify', 'HEAD'])).toThrow();
    expect(git(['diff', '--cached', '--name-only']).toString().trim()).toBe('change.txt');
  });

  it.each([
    ['WI-220', 'feat(skill-quality/WI-220): change\n\nWork-Item: WI-220'],
    ['H12-01', 'feat(skill-quality/H12-01): change'],
  ])('作業項目 %s の追跡契約を実際の履歴に保存すること', async (storyId, expected) => {
    // Arrange
    const directory = await mkdtemp(join(tmpdir(), 'phasegate-tdd-trace-'));
    temporaryRepositories.push(directory);
    const git = (args: readonly string[]) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git(['init']);
    git(['config', 'user.name', 'Phasegate Test']);
    git(['config', 'user.email', 'phasegate-test@example.invalid']);
    git(['config', 'commit.gpgSign', 'false']);
    await writeFile(join(directory, 'change.txt'), 'change\n');
    git(['add', 'change.txt']);
    const executor = new GitCommitExecutorAdapter((_file, args) => git(args));
    const validator = { validate: vi.fn().mockResolvedValue([]) };
    const useCase = new ExecuteTddCycleUseCase(new AtomicCommitService(executor, validator, validator));

    // Act
    const actual = await useCase.execute({ unit: 'skill-quality', storyId, description: 'change', phase: 'REFACTOR', passed: true });

    // Assert
    expect(actual).toEqual({ ready: true, violations: [], committedMessage: expected });
    expect(git(['log', '-1', '--format=%B']).toString().trim()).toBe(expected);
    expect(git(['status', '--porcelain']).toString()).toBe('');
  });
});

describe('TDD結果の証拠の境界', () => {
  it.each([
    { phase: 'REFACTOR' as const, violations: [], exitCode: 0, prefix: 'Commit successful:' },
    { phase: 'REFACTOR' as const, violations: [{ ruleId: 'L2-001', message: 'invalid' }], exitCode: 1, prefix: 'Validation failed:' },
    { phase: 'GREEN' as const, violations: [], exitCode: 2, prefix: 'Error:' },
  ])('終了コード $exitCode の結果でテスト未実行と申告の境界を示すこと', async ({ phase, violations, exitCode, prefix }) => {
    // Arrange
    const executor = { commit: vi.fn().mockResolvedValue(undefined) };
    const l1 = { validate: vi.fn().mockResolvedValue([]) };
    const l2 = { validate: vi.fn().mockResolvedValue(violations) };
    const handler = new ExecuteTddCycleHandler(new ExecuteTddCycleUseCase(new AtomicCommitService(executor, l1, l2)));

    // Act
    const actual = await handler.handle({ unit: 'skill-quality', storyId: 'WI-220', description: 'change', phase, passed: true });

    // Assert
    expect(actual.exitCode).toBe(exitCode);
    expect(actual.message.startsWith(prefix)).toBe(true);
    expect(actual.message).toContain('--passed は呼出元の申告');
    expect(actual.message).toContain('このコマンドはテストを実行しません');
    if (exitCode !== 0) expect(executor.commit).not.toHaveBeenCalled();
  });
});

describe('公開TDDコマンドの設定伝播', () => {
  it.each([
    { configured: false, worldEnabled: false },
    { configured: false, worldEnabled: true },
    { configured: true, worldEnabled: false },
    { configured: true, worldEnabled: true },
  ])('World=$worldEnabled configured=$configuredで独自配置の必要検出と既定互換を維持すること', async ({ configured, worldEnabled }) => {
    // Arrange: only the custom root contains a duplicate; ignoring it must not pass.
    const directory = await mkdtemp(join(tmpdir(), 'phasegate-tdd-world-'));
    temporaryRepositories.push(directory);
    const git = (args: readonly string[]) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git(['init']);
    git(['config', 'user.name', 'Phasegate Test']);
    git(['config', 'user.email', 'phasegate-test@example.invalid']);
    git(['config', 'commit.gpgSign', 'false']);
    await mkdir(join(directory, 'custom/product'), { recursive: true });
    await mkdir(join(directory, 'docs/product'), { recursive: true });
    // Isolate World from the preset's independent coverage check; this is fixture data, not measured coverage.
    await mkdir(join(directory, 'coverage'));
    await writeFile(join(directory, 'coverage/coverage-summary.json'), JSON.stringify({ total: { lines: { pct: 100 } } }));
    await writeFile(join(directory, 'docs/product/normal.md'), '# Standard root is valid\n');
    for (const name of ['one', 'two']) {
      await writeFile(join(directory, `custom/product/${name}.md`), `<!-- @world-fragment-id sample.shared -->\n# ${name}\n`);
    }
    await writeFile(join(directory, 'phasegate.config.json'), JSON.stringify({
      project: { name: 'tdd-world-fixture', preset: 'standard' },
      layers: { L1: { enabled: false }, L2: { enabled: false }, L3: { enabled: true, validators: ['L3-008'] }, L4: { enabled: false } },
      world: { enabled: worldEnabled, corpus: { productRoots: ['custom/product'] } },
      validate: { failOnWarning: false },
    }));
    await writeFile(join(directory, 'notes.txt'), 'A user change remains staged until checks pass.\n');
    await symlink(join(repositoryRoot, 'node_modules'), join(directory, 'node_modules'), 'dir');
    git(['add', 'notes.txt']);
    const run = () => spawnSync(process.execPath, [
      '--import', join(repositoryRoot, 'node_modules/tsx/dist/loader.mjs'),
      join(repositoryRoot, 'scripts/harness/main.ts'), 'skill:execute-tdd-cycle',
      '--unit', 'skill-quality', '--story', 'WI-220', '--desc', 'world check', '--phase', 'REFACTOR', '--passed',
      ...(configured ? ['--configured-validation'] : []),
    ], { cwd: directory, encoding: 'utf8', timeout: 30000, env: { ...process.env, npm_config_offline: 'true' } });

    // Act
    const actual = run();

    // Assert: legacy stays legacy; the explicit profile preserves real World checks.
    expect(actual.error).toBeUndefined();
    expect(actual.status, actual.stdout + actual.stderr).toBe(configured && worldEnabled ? 1 : 0);
    expect(actual.stdout).toContain(`Validation profile: ${configured ? 'configured' : 'legacy'}`);
    if (configured && worldEnabled) {
      expect(actual.stdout).toContain('L3-008');
      expect(() => git(['rev-parse', '--verify', 'HEAD'])).toThrow();
      expect(git(['diff', '--cached', '--name-only']).toString().trim()).toBe('notes.txt');
      await writeFile(join(directory, 'custom/product/two.md'), '<!-- @world-fragment-id sample.independent -->\n# Separate contract fragment\n');
      const resumed = run();
      expect(resumed.status, resumed.stdout + resumed.stderr).toBe(0);
    }
    expect(git(['log', '-1', '--format=%B']).toString().trim()).toBe('feat(skill-quality/WI-220): world check\n\nWork-Item: WI-220');
    expect(git(['diff', '--cached', '--name-only']).toString().trim()).toBe('');
  }, 60000);

  it.each([false, true])('構造検証の有効設定 %s に従い履歴と拒否を分けること', async (enabled) => {
    // Arrange
    const directory = await mkdtemp(join(tmpdir(), 'phasegate-tdd-cli-'));
    temporaryRepositories.push(directory);
    const git = (args: readonly string[]) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git(['init']);
    git(['config', 'user.name', 'Phasegate Test']);
    git(['config', 'user.email', 'phasegate-test@example.invalid']);
    git(['config', 'commit.gpgSign', 'false']);
    await writeFile(join(directory, 'phasegate.config.json'), JSON.stringify({
      project: { name: 'tdd-fixture', preset: 'standard' },
      layers: { L1: { enabled }, L2: { enabled: false }, L3: { enabled: false }, L4: { enabled: false } },
      validate: { failOnWarning: false },
    }));
    await mkdir(join(directory, 'scripts/harness'), { recursive: true });
    await writeFile(join(directory, 'scripts/harness/example.ts'), 'export const value = 1;\n');
    await symlink(join(repositoryRoot, 'node_modules'), join(directory, 'node_modules'), 'dir');
    git(['add', 'phasegate.config.json', 'scripts/harness/example.ts']);

    // Act
    const actual = spawnSync(process.execPath, [
      '--import', join(repositoryRoot, 'node_modules/tsx/dist/loader.mjs'),
      join(repositoryRoot, 'scripts/harness/main.ts'), 'skill:execute-tdd-cycle',
      '--unit', 'skill-quality', '--story', 'WI-220', '--desc', 'change', '--phase', 'REFACTOR', '--passed', '--configured-validation',
    ], { cwd: directory, encoding: 'utf8', timeout: 30000, env: { ...process.env, npm_config_offline: 'true' } });

    // Assert
    expect(actual.error).toBeUndefined();
    expect(actual.status, actual.stdout + actual.stderr).toBe(enabled ? 1 : 0);
    expect(actual.stdout).toContain('このコマンドはテストを実行しません');
    if (enabled) {
      expect(actual.stdout).toContain('Validation failed:');
      expect(() => git(['rev-parse', '--verify', 'HEAD'])).toThrow();
    } else {
      expect(git(['log', '-1', '--format=%B']).toString().trim()).toBe('feat(skill-quality/WI-220): change\n\nWork-Item: WI-220');
    }
  }, 40000);
});
