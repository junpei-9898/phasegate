/**
 * @layer e2e-test
 *
 * CLI エントリポイント (main.ts) の E2E テスト。
 * 実際にプロセスを起動して標準出力/終了コードを検証する。
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const MAIN = resolve(ROOT, 'scripts/harness/main.ts');

function run(...args: string[]) {
  const result = spawnSync('npx', ['tsx', MAIN, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    exitCode: result.status ?? 2,
  };
}

describe('harness CLI E2E', () => {
  describe('ヘルプ・基本動作', () => {
    it('--help でUsageが表示され exit 0 で終了する', () => {
      const actual = run('--help');

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Usage: harness <command>');
      expect(actual.stdout).toContain('enable-feature');
      expect(actual.stdout).toContain('lint');
    });

    it('引数なしでUsageが表示され exit 0 で終了する', () => {
      const actual = run();

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Usage: harness <command>');
    });

    it('未知のコマンドで exit 2 が返る', () => {
      const actual = run('unknown-command');

      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('Unknown command: unknown-command');
    });
  });

  describe('harness-error コマンド群', () => {
    it('list-errors --format human でエラー定義一覧が出力される', () => {
      const actual = run('list-errors', '--format', 'human');

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('definition(s)');
    });

    it('list-errors --format json でJSON形式の出力が返る', () => {
      const actual = run('list-errors', '--format', 'json');

      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('render-errors で空エラー配列を正常処理できる', () => {
      const actual = run('render-errors', '--format', 'human');

      expect(actual.exitCode).toBe(0);
    });
  });

  describe('config-foundation コマンド群', () => {
    it('list-features で利用可能な機能一覧が表示される', () => {
      const actual = run('list-features');

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Available features');
    });
  });

  describe('adr-foundation コマンド群', () => {
    it('validate-adr 引数なしで exit 2 が返る', () => {
      const actual = run('validate-adr');

      expect(actual.exitCode).toBe(2);
    });
  });

  describe('traceability-model コマンド群', () => {
    it('validate-metadata 引数なしで exit 2 が返る', () => {
      const actual = run('validate-metadata');

      expect(actual.exitCode).toBe(2);
    });
  });

  describe('phase-dependency-model コマンド群', () => {
    it('check-phase-gate --level 無効値で exit 2 が返る', () => {
      const actual = run('check-phase-gate', '--level', '99');

      expect(actual.exitCode).toBe(2);
    });
  });

  describe('ci-governance コマンド群', () => {
    it('ci:generate-template が "Unknown command" にならない', () => {
      const actual = run('ci:generate-template', '--preset', 'default', '--type', 'pull_request');

      expect(actual.stderr).not.toContain('Unknown command: ci:generate-template');
    });

    it('ci:migrate-agents-md --dry-run が "Unknown command" にならない', () => {
      const actual = run('ci:migrate-agents-md', '--dry-run');

      expect(actual.stderr).not.toContain('Unknown command: ci:migrate-agents-md');
    });

    it('ci:check-repetition --code が "Unknown command" にならない', () => {
      const actual = run('ci:check-repetition', '--code', 'ERR-001');

      expect(actual.stderr).not.toContain('Unknown command: ci:check-repetition');
    });
  });

  describe('skill-quality コマンド群', () => {
    it('skill:validate-structure --file が "Unknown command" にならない', () => {
      const actual = run('skill:validate-structure', '--file', 'nonexistent-skill.md');

      expect(actual.stderr).not.toContain('Unknown command: skill:validate-structure');
    });

    it('skill:check-coverage --story が "Unknown command" にならない', () => {
      const actual = run('skill:check-coverage', '--story', 'H99-01');

      expect(actual.stderr).not.toContain('Unknown command: skill:check-coverage');
    });

    it('skill:collect-lessons --story が "Unknown command" にならない', () => {
      const actual = run('skill:collect-lessons', '--story', 'H99-01');

      expect(actual.stderr).not.toContain('Unknown command: skill:collect-lessons');
    });
  });

  describe('phase2-extensions コマンド群', () => {
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

  describe('validator-system コマンド群', () => {
    it('validate が "Unknown command" にならない', () => {
      const actual = run('validate', '--layer', 'L2');

      expect(actual.stderr).not.toContain('Unknown command: validate');
    });

    it('validate --layer L1 が exit 0 または exit 1 で完了する', () => {
      const actual = run('validate', '--layer', 'L1');

      expect([0, 1]).toContain(actual.exitCode);
    });

    it('validate --format agent で agentフォーマットの出力が返る', () => {
      const actual = run('validate', '--layer', 'L2', '--format', 'agent');

      expect(actual.stderr).not.toContain('Unknown command');
      expect([0, 1]).toContain(actual.exitCode);
    });
  });

  describe('biome-ast-engine コマンド群', () => {
    it('lint が "Unknown command" にならない', () => {
      const actual = run('lint');

      expect(actual.stderr).not.toContain('Unknown command: lint');
    });

    it('lint --json でJSON形式の出力が返るかエラーになる', () => {
      const actual = run('lint', '--json');

      expect(actual.stderr).not.toContain('Unknown command: lint');
      expect([0, 1, 2]).toContain(actual.exitCode);
    });
  });

  describe('quick-mode / ci-check コマンド群', () => {
    it('ci-check --quick --dry-run が "Unknown command" にならない', () => {
      const actual = run('ci-check', '--quick', '--dry-run');

      expect(actual.stderr).not.toContain('Unknown command: ci-check');
    });

    it('ci-check --quick --dry-run が exit 0 で完了する', () => {
      const actual = run('ci-check', '--quick', '--dry-run');

      expect(actual.exitCode).toBe(0);
    });
  });

  describe('harness-api コマンド群', () => {
    it('harness:check-ready が "Unknown command" にならない', () => {
      const actual = run('harness:check-ready');

      expect(actual.stderr).not.toContain('Unknown command: harness:check-ready');
    }, 30_000);

    it('harness:check-ready が exit 0 または exit 1 で完了する', () => {
      const actual = run('harness:check-ready');

      expect([0, 1]).toContain(actual.exitCode);
    }, 30_000);

    it('harness:check-phase が "Unknown command" にならない', () => {
      const actual = run('harness:check-phase', '--unit', 'validator-system');

      expect(actual.stderr).not.toContain('Unknown command: harness:check-phase');
    }, 30_000);

    it('harness:ci-check が "Unknown command" にならない', () => {
      const actual = run('harness:ci-check');

      expect(actual.stderr).not.toContain('Unknown command: harness:ci-check');
    }, 30_000);

    it('harness:detect-drift が "Unknown command" にならない', () => {
      const actual = run('harness:detect-drift');

      expect(actual.stderr).not.toContain('Unknown command: harness:detect-drift');
    }, 30_000);

    it('harness:status が "Unknown command" にならない', () => {
      const actual = run('harness:status');

      expect(actual.stderr).not.toContain('Unknown command: harness:status');
    }, 30_000);

    it('harness:lint が "Unknown command" にならない', () => {
      const actual = run('harness:lint');

      expect(actual.stderr).not.toContain('Unknown command: harness:lint');
    }, 30_000);

    it('harness:complete-check が "Unknown command" にならない', () => {
      const actual = run('harness:complete-check');

      expect(actual.stderr).not.toContain('Unknown command: harness:complete-check');
    }, 30_000);

    it('harness:impact-analysis storyId なしで exit 0 または exit 2 が返る', () => {
      const actual = run('harness:impact-analysis');

      expect([0, 1, 2]).toContain(actual.exitCode);
      expect(actual.stderr).not.toContain('Unknown command: harness:impact-analysis');
    }, 30_000);

    it('harness:impact-analysis H99-01 が "Unknown command" にならない', () => {
      const actual = run('harness:impact-analysis', 'H99-01');

      expect(actual.stderr).not.toContain('Unknown command: harness:impact-analysis');
    }, 30_000);
  });

  describe('regression-suite コマンド群', () => {
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
});
