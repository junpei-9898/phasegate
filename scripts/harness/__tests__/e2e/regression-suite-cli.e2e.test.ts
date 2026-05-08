/**
 * @layer e2e-test
 * @unit regression-suite
 * @story H08-01
 */
import { describe, it, expect } from 'vitest';
import { run } from './cli-test-helpers.js';

describe('regression-suite CLI E2E', () => {
  it('regression:run-k-requirements が "K-Requirements" を出力して完了する', () => {
    const actual = run('regression:run-k-requirements');

    expect([0, 1]).toContain(actual.exitCode);
    expect(actual.stdout).toContain('K-Requirements');
  }, 60_000);

  it('regression:run-k-requirements --json でJSON形式の出力が返る', () => {
    const actual = run('regression:run-k-requirements', '--json');

    expect([0, 1]).toContain(actual.exitCode);
    const parsed = JSON.parse(actual.stdout);
    expect(typeof parsed).toBe('object');
  }, 60_000);

  it('regression:run-gng-gate が exit 0 で完了する（stub実装）', () => {
    const actual = run('regression:run-gng-gate');

    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('GnG Gate');
  });

  it('regression:run-agent-guard が exit 0 で完了する（stub実装）', () => {
    const actual = run('regression:run-agent-guard');

    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('Agent Independence');
  });

  it('regression:run-k14-k15 が "K14/K15" を出力して完了する', () => {
    const actual = run('regression:run-k14-k15');

    expect([0, 1]).toContain(actual.exitCode);
    expect(actual.stdout).toContain('K14/K15');
  }, 30_000);

  it('regression:configure-ci-gate デフォルト値で exit 0 が返る', () => {
    const actual = run('regression:configure-ci-gate');

    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('CI gate configured');
  });

  it('regression:configure-ci-gate --suites 不正値で exit 2 が返る', () => {
    const actual = run('regression:configure-ci-gate', '--suites', 'invalid-suite');

    expect(actual.exitCode).toBe(2);
    expect(actual.stderr).toContain('Invalid suite ID');
  });

  it('regression:configure-ci-gate --json でJSON形式の出力が返る', () => {
    const actual = run('regression:configure-ci-gate', '--json');

    expect(actual.exitCode).toBe(0);
    const parsed = JSON.parse(actual.stdout);
    expect(typeof parsed.coverageThreshold).toBe('number');
  });

  it('regression:analyze-migration が "Unknown command" にならない', () => {
    const actual = run('regression:analyze-migration', '--dry-run');

    expect(actual.stderr).not.toContain('Unknown command: regression:analyze-migration');
  });
});
