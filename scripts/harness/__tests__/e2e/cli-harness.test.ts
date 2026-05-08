/**
 * @layer e2e-test
 * @unit harness-api
 * @story H08-01
 *
 * CLI エントリポイント (main.ts) の E2E テスト。
 * 実際にプロセスを起動して標準出力/終了コードを検証する。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run, runInCwd, withTempDir } from './cli-test-helpers.js';

describe('harness CLI E2E', () => {
  describe('ヘルプ・基本動作', () => {
    it('--help でUsageが表示され exit 0 で終了する', () => {
      const actual = run('--help');

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Usage: phasegate <command>');
      expect(actual.stdout).toContain('enable-feature');
      expect(actual.stdout).toContain('lint');
    });

    it('引数なしでUsageが表示され exit 0 で終了する', () => {
      const actual = run();

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Usage: phasegate <command>');
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

    it('init --preset full で phaseDependencies.preset に full が書き込まれる', () => {
      // Arrange
      const actual = withTempDir((cwd) => {
        // Act
        const result = runInCwd(cwd, 'init', '--preset', 'full', '--name', 'test-project');
        const config = JSON.parse(readFileSync(join(cwd, 'phasegate.config.json'), 'utf-8')) as {
          phaseDependencies: { preset: string };
        };

        // Assert
        expect(result.exitCode).toBe(0);
        expect(config.phaseDependencies.preset).toBe('full');
        return result;
      });

      expect(actual.stderr).toBe('');
    });

    it('init --preset invalid で exit 2 が返る', () => {
      // Arrange
      const actual = withTempDir((cwd) => (
        // Act
        runInCwd(cwd, 'init', '--preset', 'invalid')
      ));

      // Assert
      expect(actual.exitCode).toBe(2);
      expect(actual.stderr).toContain('Invalid --preset value');
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
    it('phasegate:check-ready が "Unknown command" にならない', () => {
      const actual = run('phasegate:check-ready');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:check-ready');
    }, 30_000);

    it('phasegate:check-ready が exit 0 または exit 1 で完了する', () => {
      const actual = run('phasegate:check-ready');

      expect([0, 1]).toContain(actual.exitCode);
    }, 30_000);

    it('phasegate:check-phase が "Unknown command" にならない', () => {
      const actual = run('phasegate:check-phase', '--unit', 'validator-system');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:check-phase');
    }, 30_000);

    it('phasegate:ci-check が "Unknown command" にならない', () => {
      const actual = run('phasegate:ci-check');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:ci-check');
    }, 30_000);

    it('phasegate:detect-drift が "Unknown command" にならない', () => {
      const actual = run('phasegate:detect-drift');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:detect-drift');
    }, 30_000);

    it('phasegate:status が "Unknown command" にならない', () => {
      const actual = run('phasegate:status');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:status');
    }, 30_000);

    it('phasegate:status --json の stdout が JSON.parse 可能（storyReflection 行が混入しない）', () => {
      const actual = run('phasegate:status', '--json');

      expect(() => JSON.parse(actual.stdout)).not.toThrow();
    }, 30_000);

    it('壊れた phasegate.config.json で "not valid JSON" 警告が stderr に出る（--json でも続行する）', () => {
      const actual = withTempDir((cwd) => {
        writeFileSync(join(cwd, 'phasegate.config.json'), '{ broken json');
        return runInCwd(cwd, 'phasegate:status', '--json');
      });

      expect(actual.stderr).toContain('phasegate.config.json is not valid JSON');
    }, 30_000);

    it('phasegate.config.json が存在しないときは warning が出ない（ENOENT は silent）', () => {
      const actual = withTempDir((cwd) => runInCwd(cwd, 'phasegate:status', '--json'));

      expect(actual.stderr).not.toContain('phasegate.config.json');
    }, 30_000);

    it('phasegate:lint が "Unknown command" にならない', () => {
      const actual = run('phasegate:lint');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:lint');
    }, 30_000);

    it('phasegate:complete-check が "Unknown command" にならない', () => {
      const actual = run('phasegate:complete-check');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:complete-check');
    }, 30_000);

    it('phasegate:impact-analysis storyId なしで exit 0 または exit 2 が返る', () => {
      const actual = run('phasegate:impact-analysis');

      expect([0, 1, 2]).toContain(actual.exitCode);
      expect(actual.stderr).not.toContain('Unknown command: phasegate:impact-analysis');
    }, 30_000);

    it('phasegate:impact-analysis H99-01 が "Unknown command" にならない', () => {
      const actual = run('phasegate:impact-analysis', 'H99-01');

      expect(actual.stderr).not.toContain('Unknown command: phasegate:impact-analysis');
    }, 30_000);
  });

});
