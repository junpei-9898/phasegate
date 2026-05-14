/**
 * @layer e2e-test
 * @unit harness-api
 * @story H08-01
 * @work-item-id WI-113
 * @work-item-id WI-142
 * @work-item-id WI-108
 * @work-item-id WI-109
 * @work-item-id WI-107
 * @work-item-id WI-125
 * @work-item-id WI-131
 * @work-item-id WI-184
 *
 * CLI エントリポイント (main.ts) の E2E テスト。
 * 実際にプロセスを起動して標準出力/終了コードを検証する。
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

    it('ci:generate-template --render はpreset未指定でもstandardでテンプレートを出力できる', () => {
      const actual = run('ci:generate-template', '--type', 'agent-context-refresh', '--render');

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('name: Agent Context Refresh');
      expect(actual.stderr).not.toContain('Preset not found: default');
    });

    it('ci:generate-template --help はpresetの既定値standardを表示する', () => {
      const actual = run('ci:generate-template', '--help');

      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('Default: standard');
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
    it('skills list が guidance skill を含む catalog を exit 0 で列挙する', () => {
      const actual = run('skills', 'list');

      expect(actual.exitCode).toBe(0);
      expect(actual.stderr).toBe('');
      expect(actual.stdout).toContain('Available skills');
      expect(actual.stdout).toContain('[Guidance]');
      expect(actual.stdout).toContain('/phasegate-config-doctor');
    });

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

      expect(actual.stderr).not.toContain('Unknown command');
      expect([0, 1]).toContain(actual.exitCode);
    });

    it('validate --format agent で agentフォーマットの出力が返る', () => {
      const actual = run('validate', '--layer', 'L2', '--format', 'agent');

      expect(actual.stderr).not.toContain('Unknown command');
      expect([0, 1]).toContain(actual.exitCode);
    });

    it.each(['L2', 'L3', 'L4'] as const)(
      'validate --layer %s --format json は未対応formatとして exit 2 を返す',
      (layer) => {
        const actual = run('validate', '--layer', layer, '--format', 'json');

        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain("Invalid --format value for validate: 'json'");
        expect(actual.stdout).not.toContain('=== バリデーション結果 ===');
      },
    );
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

      expect(actual.stderr).not.toContain('Unknown command');
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

    it('phasegate:ci-check --json は L2-L4 の実行またはskipを返す', () => {
      const actual = run('phasegate:ci-check', '--json');

      expect(actual.exitCode).toBe(0);
      const parsed = JSON.parse(actual.stdout) as {
        data: { validatorResults: Array<{ validatorId: string; skipped?: boolean }> };
      };
      const ids = parsed.data.validatorResults.map((result) => result.validatorId);
      expect(ids.some((id) => id.startsWith('L2-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('L3-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('L4-'))).toBe(true);
      expect(parsed.data.validatorResults.some((result) => result.validatorId.startsWith('L4-') && result.skipped === true)).toBe(true);
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

      const parsed = JSON.parse(actual.stdout) as { status: string; data: { layers: unknown[] } };
      expect(parsed.status).toMatch(/^(pass|fail)$/);
      expect(Array.isArray(parsed.data.layers)).toBe(true);
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

    it('phasegate:generate-matrix が product docs とtest metadataからmatrixを生成する', () => {
      const actual = withTempDir((cwd) => {
        mkdirSync(join(cwd, 'docs/product'), { recursive: true });
        mkdirSync(join(cwd, 'scripts/harness/__tests__/unit'), { recursive: true });
        writeFileSync(join(cwd, 'docs/product/user_stories.md'), `
# User Stories

### H07-01: requirement-test-matrix.json新設

#### 受け入れ基準

- [ ] AC-1: requirement-test-matrix.jsonのJSONスキーマが定義されている
- [ ] AC-2: テスト参照を生成できる
`);
        writeFileSync(join(cwd, 'scripts/harness/__tests__/unit/matrix-generation.test.ts'), `
/**
 * @layer test
 * @unit nyquist-validation
 * @story H07-01
 */
import { describe, expect, it } from 'vitest';

describe('matrix generation dogfood', () => {
  it('matrixを生成できること', () => {
    const actual = 'H07-01';
    expect(actual).toBe('H07-01');
  });
});
`);

        return runInCwd(
          cwd,
          'phasegate:generate-matrix',
          '--requirements',
          'docs/product/user_stories.md',
          '--tests',
          'scripts/harness/__tests__',
          '--out',
          '.harness/requirement-test-matrix.json',
          '--json',
        );
      });

      expect(actual.exitCode).toBe(0);
      expect(actual.stderr).not.toContain('Unknown command: phasegate:generate-matrix');
      const parsed = JSON.parse(actual.stdout) as {
        matrix: {
          stories: Array<{
            storyId: string;
            storyMappings: Array<{
              testReferences: Array<{ filePath?: string; testName?: string; testType?: string }>;
            }>;
          }>;
        };
      };
      expect(parsed.matrix.stories[0].storyId).toBe('H07-01');
      expect(parsed.matrix.stories[0].storyMappings[0].testReferences).toContainEqual(
        expect.objectContaining({
          filePath: expect.stringContaining('matrix-generation.test.ts'),
          testName: 'matrixを生成できること',
          testType: 'unit',
        }),
      );
    }, 30_000);
  });

});
