/**
 * @layer e2e-test
 * @unit phase2-extensions
 * @story H08-01
 */
import { describe, it, expect } from 'vitest';
import { run } from './cli-test-helpers.js';

describe('phase2-extensions CLI E2E', () => {
  // SC-P2-001
  it('p2:check-freshness が "Unknown command" にならない', () => {
    const actual = run('p2:check-freshness', '--dry-run');

    expect(actual.stderr).not.toContain('Unknown command: p2:check-freshness');
  }, 30_000);

  // SC-P2-002
  it('p2:check-freshness --dry-run が exit 0 で完了する', () => {
    const actual = run('p2:check-freshness', '--dry-run');

    expect(actual.exitCode).toBe(0);
  }, 30_000);

  // SC-P2-003
  it('p2:check-freshness --format json でJSON形式の出力が返る', () => {
    const actual = run('p2:check-freshness', '--format', 'json', '--dry-run');

    expect([0, 1]).toContain(actual.exitCode);
    expect(actual.stdout).toMatch(/^\s*[\[{]/);
  }, 30_000);

  // SC-P2-004
  it('p2:check-freshness --pattern でパターン指定を受け付ける', () => {
    const actual = run('p2:check-freshness', '--pattern', 'docs/**/*.md', '--dry-run');

    expect(actual.stderr).not.toContain('Unknown command');
  }, 30_000);

  // SC-P2-005
  it('p2:validate-pointers が "Unknown command" にならない', () => {
    const actual = run('p2:validate-pointers');

    expect(actual.stderr).not.toContain('Unknown command: p2:validate-pointers');
  });

  // SC-P2-006
  it('p2:validate-pointers --include-urls を受け付ける', () => {
    const actual = run('p2:validate-pointers', '--include-urls');

    expect(actual.stderr).not.toContain('Unknown command');
  });

  // SC-P2-007
  it('p2:validate-pointers --format json でJSON形式の出力が返る', () => {
    const actual = run('p2:validate-pointers', '--format', 'json');

    expect([0, 1]).toContain(actual.exitCode);
    expect(actual.stdout).toMatch(/^\s*[\[{]/);
  });

  // SC-P2-008
  it('p2:generate-e2e-template --phase でテンプレートが生成される', () => {
    const actual = run('p2:generate-e2e-template', '--phase', 'construction');

    expect(actual.stderr).not.toContain('Unknown command: p2:generate-e2e-template');
    expect(actual.exitCode).toBe(0);
  });

  // SC-P2-009
  it('p2:generate-e2e-template --phase なしで exit 2 が返る', () => {
    const actual = run('p2:generate-e2e-template');

    expect(actual.exitCode).toBe(2);
  });

  // SC-P2-010
  it('p2:generate-e2e-template --phase 指定でテンプレート内容が出力される', () => {
    const actual = run('p2:generate-e2e-template', '--phase', 'test');

    expect(actual.exitCode).toBe(0);
    expect(actual.stdout.length).toBeGreaterThan(0);
  });
});
