// @unit harness-api
// @story H02-01
// @work-item-id WI-384

/**
 * @layer e2e-test
 *
 * CLI 呼び出しは `cli-harness.test.ts` と同様に
 * Node の `--import tsx` で `<repo>/scripts/harness/main.ts ...` を spawnSync する。
 * `main.ts` は `process.cwd()` を project root として扱うため、
 * 一時ディレクトリを cwd にして custom preset 設定を読ませる。
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execPath } from 'node:process';

const ROOT = resolve(process.cwd());
const MAIN = resolve(ROOT, 'scripts/harness/main.ts');
const TSX_LOADER = resolve(ROOT, 'node_modules/tsx/dist/loader.mjs');

function runInCwd(cwd: string, ...args: string[]) {
  const result = spawnSync(execPath, ['--import', TSX_LOADER, MAIN, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    status: result.status,
  };
}

function withTempDir<T>(testFn: (cwd: string) => T): T {
  const cwd = mkdtempSync(join(tmpdir(), 'custom-preset-cli-e2e-'));

  try {
    return testFn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function ensureFile(cwd: string, relativePath: string, content: string): void {
  const absolutePath = join(cwd, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf-8');
}

function createPhaseGateConfig(gateLevel: number): string {
  return `${JSON.stringify(
    {
      project: {
        name: 'custom-gate-project',
        preset: 'minimal',
      },
      layers: {},
      quickMode: {},
      phaseDependencies: {
        preset: 'custom',
        override: true,
        customRules: [],
        gates: [
          {
            name: 'story-impl',
            level: gateLevel,
            requires: [
              {
                path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md',
                required: true,
              },
            ],
            blocks: ['scripts/harness/example/**/*.ts'],
            dependsOn: [],
            storyAnnotation: {
              required: true,
              tag: '@story-id',
            },
          },
        ],
      },
      planningMode: {
        default: 'interactive',
        perPhase: {},
      },
      harnesses: {},
      paths: {
        designDocs: 'docs/product/construction',
        inceptionDocs: 'docs/inception',
      },
      reporting: {
        format: 'json',
        outputDir: '.harness/reports',
      },
    },
    null,
    2,
  )}\n`;
}

function seedCustomPresetProject(
  cwd: string,
  options: {
    gateLevel?: number;
    includeStoryAnnotation?: boolean;
  } = {},
): string {
  const targetFilePath = 'scripts/harness/example/application/usecase.ts';
  const includeStoryAnnotation = options.includeStoryAnnotation ?? true;

  ensureFile(cwd, 'phasegate.config.json', createPhaseGateConfig(options.gateLevel ?? 3));
  ensureFile(cwd, 'docs/product/user_stories.md', '# Stories\n- H01-01\n');
  ensureFile(cwd, 'docs/product/units/example_unit.md', 'Unit ID: example\n');
  ensureFile(cwd, 'docs/inception/example/H01-01/tdd_implementation_plan.md', '# plan\n');
  ensureFile(
    cwd,
    targetFilePath,
    `${includeStoryAnnotation ? '@story-id H01-01\n' : ''}export const value = 1;\n`,
  );

  return targetFilePath;
}

describe('custom preset CLI E2E', () => {
  it('custom preset の gates[] を満たす対象ファイルで check-phase-gate が exit 0 を返すこと', () => {
    // Arrange
    const actual = withTempDir((cwd) => {
      const targetFilePath = seedCustomPresetProject(cwd);

      // Act
      return runInCwd(
        cwd,
        'check-phase-gate',
        '--level',
        '3',
        '--unit',
        'example',
        '--story',
        'H01-01',
        '--target-file',
        targetFilePath,
      );
    });

    // Assert
    expect(actual.status, actual.stderr).toBe(0);
    expect(actual.stdout).toContain('Phase Gate Level 3: PASSED');
  });

  it('custom preset で @story-id 注釈が欠落している対象ファイルは blocker 付きで失敗すること', () => {
    // Arrange
    const actual = withTempDir((cwd) => {
      const targetFilePath = seedCustomPresetProject(cwd, {
        includeStoryAnnotation: false,
      });

      // Act
      return runInCwd(
        cwd,
        'check-phase-gate',
        '--level',
        '3',
        '--unit',
        'example',
        '--story',
        'H01-01',
        '--target-file',
        targetFilePath,
      );
    });

    // Assert
    expect(actual.status).not.toBe(0);
    expect(`${actual.stdout}\n${actual.stderr}`).toContain('@story-id 注釈が必要です');
  });

  it('custom preset の gates[] がスキーマ違反なら fail-fast で schema error を返すこと', () => {
    // Arrange
    const actual = withTempDir((cwd) => {
      const targetFilePath = seedCustomPresetProject(cwd, {
        gateLevel: 99,
      });

      // Act
      return runInCwd(
        cwd,
        'check-phase-gate',
        '--level',
        '3',
        '--unit',
        'example',
        '--story',
        'H01-01',
        '--target-file',
        targetFilePath,
      );
    });

    // Assert
    expect(actual.status).toBe(2);
    expect(actual.stderr).toContain('Invalid phasegate.config.json');
    expect(actual.stderr).toMatch(/phaseDependencies\/gates\/0\/level|must be one of 1, 2, 3/);
  });
});
