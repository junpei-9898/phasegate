// @story H11-01
// @layer e2e-test
// @unit installation
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const enabled = process.env.PHASEGATE_UPGRADE_SMOKE === '1';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const projects: string[] = [];

function run(project: string, command: string, args: string[], input?: string) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(npm_|PNPM_|VITEST)/i.test(key)));
  const actual = spawnSync(command, args, { cwd: project, env, input, encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });
  if (actual.error) throw actual.error;
  return { exitCode: actual.status ?? -1, stdout: actual.stdout, stderr: actual.stderr };
}

function cli(project: string, ...args: string[]) {
  return run(project, join(project, 'node_modules/.bin/phasegate'), args);
}

function installPackage(project: string, archive: string) {
  const actual = run(project, 'npm', ['install', '--no-audit', '--no-fund', archive]);
  expect(actual.exitCode, actual.stderr).toBe(0);
  // Same version strings must not let npm silently retain the other archive.
  const packedRuntime = run(project, 'tar', ['-xOf', archive, 'package/scripts/harness/main.ts']);
  expect(packedRuntime.exitCode, packedRuntime.stderr).toBe(0);
  expect(readFileSync(join(project, 'node_modules/phasegate/scripts/harness/main.ts'), 'utf8')).toBe(packedRuntime.stdout);
}

function snapshot(project: string): Record<string, string> {
  const files: Record<string, string> = {};
  function visit(relative: string) {
    for (const entry of readdirSync(join(project, relative), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'package.json' || entry.name === 'package-lock.json') continue;
      const path = join(relative, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files[path] = createHash('sha256').update(readFileSync(join(project, path))).digest('hex');
      else if (entry.isSymbolicLink()) files[path] = `symlink:${readlinkSync(join(project, path))}`;
    }
  }
  visit('');
  return files;
}

function diagnostics(project: string) {
  return [['doctor', '--json'], ['validate', '--layer', 'L2', '--json']].map((args) => {
    const actual = cli(project, ...args);
    expect([0, 1], `${args.join(' ')}: ${actual.stderr}`).toContain(actual.exitCode);
    expect(() => JSON.parse(actual.stdout)).not.toThrow();
    return { command: args[0], exitCode: actual.exitCode };
  });
}

function gateDecisions(project: string, requireConfigProtection = true) {
  const cases = [
    { name: 'read', tool: 'Read', path: 'user-notes.md', expected: 0 },
    { name: 'document-write', tool: 'Write', path: 'user-notes.md', expected: 0 },
    { name: 'protected-write', tool: 'Write', path: 'phasegate.config.json', expected: 2 },
    { name: 'read-after-denial', tool: 'Read', path: 'user-notes.md', expected: 0 },
  ];
  return cases.map(({ name, tool, path, expected }) => {
    const payload = JSON.stringify({ cwd: project, tool_name: tool, tool_input: { file_path: join(project, path), content: '# Proposed edit\n' } });
    const actual = run(project, join(project, 'node_modules/.bin/phasegate'), ['hook', 'pre-tool-use'], payload);
    if (expected === 2 && !requireConfigProtection) {
      // Observe historical behavior, then compare it with the candidate below.
      // Old releases may predate config protection; do not assume they deny.
      expect([0, 2], `${name}: ${actual.stderr}`).toContain(actual.exitCode);
    } else {
      expect(actual.exitCode, `${name}: ${actual.stderr}`).toBe(expected);
    }
    if (actual.exitCode === 2) {
      expect(actual.stderr).toContain('phasegate.config.json');
      expect(actual.stderr).toContain('保護');
    } else {
      expect(actual.stdout).toBe('');
    }
    return { name, exitCode: actual.exitCode, protectedDenial: actual.stderr.includes('保護') };
  });
}

describe.skipIf(!enabled)('既存導入の配布物更新と旧版復旧', () => {
  afterAll(() => {
    for (const project of projects) rmSync(project, { recursive: true, force: true });
  });

  it('既存のcoverage設定を持つ文書TDD操作で更新後だけ拒否を増やさないこと', () => {
    const archives = [process.env.PHASEGATE_OLD_TARBALL, process.env.PHASEGATE_TARBALL];
    if (archives.some((archive) => !archive)) throw new Error('Both archive paths are required');
    const results = archives.map((archive, index) => {
      const project = mkdtempSync(join(tmpdir(), 'phasegate-tdd-upgrade-'));
      projects.push(project);
      writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'tdd-upgrade', version: '0.0.0', private: true }));
      installPackage(project, resolve(archive!));
      for (const args of [['init'], ['config', 'user.name', 'Phasegate Test'], ['config', 'user.email', 'test@example.invalid'], ['config', 'commit.gpgSign', 'false']]) {
        const setup = run(project, 'git', args);
        expect(setup.exitCode, setup.stderr).toBe(0);
      }
      writeFileSync(join(project, 'phasegate.config.json'), JSON.stringify({
        project: { name: 'tdd-upgrade', preset: 'standard' },
        layers: { L3: { coverageThreshold: 90 } },
      }));
      writeFileSync(join(project, 'notes.txt'), 'An existing documentation change.\n');
      expect(run(project, 'git', ['add', 'notes.txt']).exitCode).toBe(0);

      const actual = cli(project, 'skill:execute-tdd-cycle', '--unit', 'skill-quality', '--story', 'WI-220', '--desc', 'document change', '--phase', 'REFACTOR', '--passed');
      const history = run(project, 'git', ['log', '-1', '--format=%s']);
      if (index === 1 && actual.exitCode === 0) {
        expect(actual.stdout).toContain('Validation profile: legacy');
        const head = run(project, 'git', ['rev-parse', 'HEAD']).stdout;
        writeFileSync(join(project, 'next.txt'), 'The explicit configured profile must keep required checks.\n');
        expect(run(project, 'git', ['add', 'next.txt']).exitCode).toBe(0);
        const configured = cli(project, 'skill:execute-tdd-cycle', '--unit', 'skill-quality', '--story', 'WI-220', '--desc', 'next change', '--phase', 'REFACTOR', '--passed', '--configured-validation');
        expect(configured.exitCode, configured.stdout + configured.stderr).toBe(1);
        expect(configured.stdout).toContain('L3-003');
        expect(configured.stdout).toContain('Validation profile: configured');
        expect(run(project, 'git', ['rev-parse', 'HEAD']).stdout).toBe(head);
        expect(run(project, 'git', ['diff', '--cached', '--name-only']).stdout.trim()).toBe('next.txt');
        // Controlled coverage-report fixture, not a claim that this test ran product coverage.
        mkdirSync(join(project, 'coverage'));
        writeFileSync(join(project, 'coverage/coverage-summary.json'), JSON.stringify({ total: { lines: { pct: 100 } } }));
        const resumed = cli(project, 'skill:execute-tdd-cycle', '--unit', 'skill-quality', '--story', 'WI-220', '--desc', 'next change', '--phase', 'REFACTOR', '--passed', '--configured-validation');
        expect(resumed.exitCode, resumed.stdout + resumed.stderr).toBe(0);
        expect(run(project, 'git', ['rev-parse', 'HEAD']).stdout).not.toBe(head);
        expect(run(project, 'git', ['diff', '--cached', '--name-only']).stdout.trim()).toBe('');
      }
      return { ...actual, committed: history.exitCode === 0 };
    });
    expect(results[0].exitCode, JSON.stringify(results[0])).toBe(0);
    expect(results[0].committed).toBe(true);
    expect(results[1].exitCode, JSON.stringify(results[1])).toBe(results[0].exitCode);
    expect(results[1].committed).toBe(results[0].committed);
  }, 180000);

  it('設定の正規変更で文書編集を再開でき直接書込み保護は維持されること', () => {
    // Arrange: old installed runtime sets strict policy in a disposable project.
    const oldArchive = process.env.PHASEGATE_OLD_TARBALL;
    const candidateArchive = process.env.PHASEGATE_TARBALL;
    if (!oldArchive || !candidateArchive) throw new Error('Both archive paths are required');
    const project = mkdtempSync(join(tmpdir(), 'phasegate-config-recovery-'));
    projects.push(project);
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'config-recovery', version: '0.0.0', private: true }));
    installPackage(project, resolve(oldArchive));
    const installed = cli(project, 'install', '--apply', '--agent', 'claude');
    expect(installed.exitCode, installed.stderr).toBe(0);
    const strict = cli(project, 'config:plan', '--intent', 'quick-mode-strict', '--apply', '--json');
    expect(strict.exitCode, strict.stderr).toBe(0);
    writeFileSync(join(project, 'user-notes.md'), '# User notes\n');
    const configPath = join(project, 'phasegate.config.json');
    const beforeText = readFileSync(configPath, 'utf8');
    const before = JSON.parse(beforeText);
    expect(before.quickMode.allowedCategories).toEqual(['bugfix']);
    installPackage(project, resolve(candidateArchive));
    expect(readFileSync(configPath, 'utf8')).toBe(beforeText);
    const preWrite = (path: string) => run(project, join(project, 'node_modules/.bin/phasegate'), ['hook', 'pre-tool-use'],
      JSON.stringify({ cwd: project, tool_name: 'Write', tool_input: { file_path: join(project, path), content: '# Proposed edit\n' } }));

    // Act / Assert: both blocked operations point to an executable management path.
    const deniedDoc = preWrite('user-notes.md');
    expect(deniedDoc.exitCode, deniedDoc.stderr).toBe(2);
    expect(deniedDoc.stderr).toContain('config:plan --intent quick-mode-relax');
    const deniedConfig = preWrite('phasegate.config.json');
    expect(deniedConfig.exitCode, deniedConfig.stderr).toBe(2);
    expect(deniedConfig.stderr).toContain('保護');
    expect(deniedConfig.stderr).toContain('config:plan --intent quick-mode-relax');

    // Act / Assert: preview is non-mutating and describes the one intended change.
    const args = ['config:plan', '--intent', 'quick-mode-relax', '--json'];
    const preview = cli(project, ...args, '--dry-run');
    expect(preview.exitCode, preview.stderr).toBe(0);
    const plan = JSON.parse(preview.stdout);
    expect(plan.configPatch.operations).toEqual([{
      op: 'replace', pointer: '/quickMode/allowedCategories', before: ['bugfix'], after: ['bugfix', 'docs', 'test', 'config'],
    }]);
    expect(readFileSync(configPath, 'utf8')).toBe(beforeText);

    // Act / Assert: explicit application preserves unrelated settings and a backup.
    const managementAllowed = run(project, join(project, 'node_modules/.bin/phasegate'), ['hook', 'pre-tool-use'],
      JSON.stringify({ cwd: project, tool_name: 'Bash', tool_input: {
        command: `"${join(project, 'node_modules/.bin/phasegate')}" config:plan --intent quick-mode-relax --json --apply`,
      } }));
    expect(managementAllowed.exitCode, managementAllowed.stderr).toBe(0);
    const applied = cli(project, ...args, '--apply');
    expect(applied.exitCode, applied.stderr).toBe(0);
    const result = JSON.parse(applied.stdout);
    expect(result.applyResult.changed).toBe(true);
    expect(JSON.parse(readFileSync(join(project, result.applyResult.backupPath), 'utf8'))).toEqual(before);
    const expected = { ...before, quickMode: { ...before.quickMode, allowedCategories: ['bugfix', 'docs', 'test', 'config'] } };
    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toEqual(expected);
    expect(preWrite('user-notes.md').exitCode).toBe(0);
    const stillProtected = preWrite('phasegate.config.json');
    expect(stillProtected.exitCode, stillProtected.stderr).toBe(2);
    expect(stillProtected.stderr).toContain('保護');

    // Act / Assert: repeating the explicit operation cannot reintroduce the block.
    const actual = cli(project, ...args, '--apply');
    expect(actual.exitCode, actual.stderr).toBe(0);
    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toEqual(expected);
    expect(preWrite('user-notes.md').exitCode).toBe(0);
    expect(readFileSync(join(project, 'user-notes.md'), 'utf8')).toBe('# User notes\n');
  }, 300_000);

  it('利用者が変更した管理ファイルは更新で拒否・保持され明示更新時のバックアップから確認できること', () => {
    // Arrange
    const oldInput = process.env.PHASEGATE_OLD_TARBALL;
    const candidateInput = process.env.PHASEGATE_TARBALL;
    if (!oldInput || !candidateInput) throw new Error('Both archive paths are required');
    const project = mkdtempSync(join(tmpdir(), 'phasegate-upgrade-conflict-'));
    projects.push(project);
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'upgrade-conflict', version: '0.0.0', private: true }));
    installPackage(project, resolve(oldInput));
    const initial = cli(project, 'install', '--apply', '--agent', 'claude', '--with-ci');
    expect(initial.exitCode, initial.stderr).toBe(0);
    const target = '.github/workflows/phasegate-aidlc-gate.yml';
    const userContent = `${readFileSync(join(project, target), 'utf8')}\n# user-owned CI customization\n`;
    writeFileSync(join(project, target), userContent);
    installPackage(project, resolve(candidateInput));
    const before = snapshot(project);

    // Act / Assert: preview does not mutate files.
    const preview = cli(project, 'reconcile', '--dry-run', '--json');
    expect([0, 1], preview.stderr).toContain(preview.exitCode);
    expect(JSON.parse(preview.stdout).plan).toEqual(expect.arrayContaining([expect.objectContaining({ path: target })]));
    expect(snapshot(project)).toEqual(before);

    // Act / Assert: conflict and identical retry both preserve user content.
    for (let attempt = 0; attempt < 2; attempt++) {
      const actual = cli(project, 'reconcile', '--apply', '--json');
      expect(actual.exitCode, actual.stderr).toBe(1);
      expect(JSON.parse(actual.stdout).refused).toEqual(expect.arrayContaining([expect.objectContaining({ path: target })]));
      expect(readFileSync(join(project, target), 'utf8')).toBe(userContent);
    }

    // Act / Assert: explicit operator-selected replacement has a recoverable backup.
    // This force flag concerns only this disposable fixture, not the real project.
    const repaired = cli(project, 'reconcile', '--apply', '--force', '--json');
    expect(repaired.exitCode, repaired.stderr).toBe(0);
    const backupDir = JSON.parse(repaired.stdout).backupDir;
    expect(typeof backupDir).toBe('string');
    const backup = resolve(project, backupDir, target);
    expect(readFileSync(backup, 'utf8')).toBe(userContent);
    expect(readFileSync(join(project, target), 'utf8')).not.toBe(userContent);

    // Act / Assert: later user edits survive runtime rollback; backup remains intact.
    const laterContent = `${userContent}# later user edit\n`;
    writeFileSync(join(project, target), laterContent);
    installPackage(project, resolve(oldInput));
    expect(readFileSync(join(project, target), 'utf8')).toBe(laterContent);
    expect(readFileSync(backup, 'utf8')).toBe(userContent);
    const rollback = cli(project, 'reconcile', '--apply', '--json');
    expect(rollback.exitCode, rollback.stderr).toBe(1);
    expect(JSON.parse(rollback.stdout).refused).toEqual(expect.arrayContaining([expect.objectContaining({ path: target })]));
    expect(readFileSync(join(project, target), 'utf8')).toBe(laterContent);
  }, 300_000);

  it('runtime更新・再配置・旧版復旧で設定と利用者文書を保持し既存の診断経路が動くこと', () => {
    // Arrange: explicitly supplied archives, never an implicit latest version.
    const oldInput = process.env.PHASEGATE_OLD_TARBALL;
    const candidateInput = process.env.PHASEGATE_TARBALL;
    if (!oldInput || !candidateInput) throw new Error('PHASEGATE_OLD_TARBALL and PHASEGATE_TARBALL are required');
    const oldArchive = resolve(oldInput);
    const candidateArchive = resolve(candidateInput);
    expect(existsSync(oldArchive)).toBe(true);
    expect(existsSync(candidateArchive)).toBe(true);
    expect(createHash('sha256').update(readFileSync(candidateArchive)).digest('hex'))
      .not.toBe(createHash('sha256').update(readFileSync(oldArchive)).digest('hex'));
    const project = mkdtempSync(join(tmpdir(), 'phasegate-upgrade-compatibility-'));
    projects.push(project);
    cpSync(join(repoRoot, 'scripts/harness/__tests__/fixtures/release-smoke/docs-only'), project, { recursive: true });
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'upgrade-compatibility', version: '0.0.0', private: true }));
    installPackage(project, oldArchive);
    const initial = cli(project, 'install', '--apply', '--agent', 'claude');
    expect(initial.exitCode, initial.stderr).toBe(0);
    const userDocument = '# 利用者のメモ\n\n更新や復旧でも残す。\n';
    writeFileSync(join(project, 'user-notes.md'), userDocument);
    const config = readFileSync(join(project, 'phasegate.config.json'), 'utf8');
    const baseline = diagnostics(project);
    const baselineGateDecisions = gateDecisions(project, false);
    const oldVersion = JSON.parse(readFileSync(join(project, 'node_modules/phasegate/package.json'), 'utf8')).version;
    const expectedCandidateDecisions = oldVersion === '0.335.0'
      ? baselineGateDecisions.map(decision => decision.name === 'protected-write'
        ? { ...decision, exitCode: 2, protectedDenial: true } : decision)
      : baselineGateDecisions;
    if (oldVersion === '0.335.0') expect(baselineGateDecisions.find(decision => decision.name === 'protected-write'))
      .toEqual({ name: 'protected-write', exitCode: 0, protectedDenial: false });
    const before = snapshot(project);

    // Act / Assert: new runtime with old deployed artifacts.
    installPackage(project, candidateArchive);
    expect(snapshot(project)).toEqual(before);
    expect(diagnostics(project)).toEqual(baseline);
    expect(gateDecisions(project)).toEqual(expectedCandidateDecisions);

    // Act / Assert: re-run setup without force; preserve user-owned files.
    const reapplied = cli(project, 'install', '--apply', '--agent', 'claude');
    expect(reapplied.exitCode, reapplied.stderr).toBe(0);
    expect(readFileSync(join(project, 'phasegate.config.json'), 'utf8')).toBe(config);
    expect(readFileSync(join(project, 'user-notes.md'), 'utf8')).toBe(userDocument);
    expect(diagnostics(project)).toEqual(baseline);
    expect(gateDecisions(project)).toEqual(expectedCandidateDecisions);
    const updated = snapshot(project);

    // Act / Assert: old runtime with the artifacts left by candidate setup.
    installPackage(project, oldArchive);
    expect(snapshot(project)).toEqual(updated);
    expect(diagnostics(project)).toEqual(baseline);
    expect(gateDecisions(project, false)).toEqual(baselineGateDecisions);
    expect(readFileSync(join(project, 'phasegate.config.json'), 'utf8')).toBe(config);
    expect(readFileSync(join(project, 'user-notes.md'), 'utf8')).toBe(userDocument);
  }, 300_000);
});
