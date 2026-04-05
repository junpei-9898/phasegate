// @unit agent-integration
// @layer infrastructure

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { WriteTargetScope } from '../../../agent-integration/domain/value-objects/write-target-scope.js';
import { PhaseGateQueryAdapter } from '../../../agent-integration/infrastructure/adapters/phase-gate-query-adapter.js';

const tempDirs: string[] = [];
const originalCwd = process.cwd();

async function createTempRoot(): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'phase-gate-query-custom-'));
  tempDirs.push(rootDir);
  return rootDir;
}

async function ensureFile(
  rootDir: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
}

async function writeValidConfig(rootDir: string): Promise<void> {
  const config = {
    project: {
      name: 'custom-gate-project',
      preset: 'minimal',
    },
    layers: {},
    quickMode: {},
    phaseDependencies: {
      preset: 'custom',
      override: false,
      customRules: [],
      gates: [
        {
          name: 'story-implementor',
          level: 3,
          requires: [
            {
              path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md',
              required: true,
            },
          ],
          blocks: ['scripts/harness/example/**'],
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
  };

  await ensureFile(rootDir, 'phasegate.config.json', `${JSON.stringify(config, null, 2)}\n`);
}

async function writeInvalidConfig(rootDir: string): Promise<void> {
  const config = {
    project: {
      name: 'custom-gate-project',
      preset: 'minimal',
    },
    layers: {},
    quickMode: {},
    phaseDependencies: {
      preset: 'custom',
      override: false,
      customRules: [],
      gates: [
        {
          name: 'story-implementor',
          level: 99,
          requires: [],
          blocks: ['scripts/harness/example/**'],
          dependsOn: [],
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
  };

  await ensureFile(rootDir, 'phasegate.config.json', `${JSON.stringify(config, null, 2)}\n`);
}

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

target('PhaseGateQueryAdapter custom integration', () => {
  it('hook adapter が custom gates を通して blocker なしで通過できること', async () => {
    // Arrange
    const rootDir = await createTempRoot();
    await writeValidConfig(rootDir);
    await ensureFile(rootDir, 'docs/product/user_stories.md', '# Stories\n- H01-01\n');
    await ensureFile(rootDir, 'docs/product/units/example_unit.md', 'Unit ID: example\n');
    await ensureFile(rootDir, 'docs/inception/example/H01-01/tdd_implementation_plan.md', '# plan\n');
    await ensureFile(
      rootDir,
      'scripts/harness/example/application/usecase.ts',
      '@story-id H01-01\nexport const value = 1;\n',
    );
    process.chdir(rootDir);
    const adapter = new PhaseGateQueryAdapter();
    const scope = WriteTargetScope.create({ level: 3, unitId: 'example', storyId: 'H01-01' });

    // Act
    const actual = await adapter.checkGate(scope, 'scripts/harness/example/application/usecase.ts');

    // Assert
    expect(actual.hasPassed()).toBe(true);
    expect(actual.getBlockers()).toEqual([]);
    expect(actual.getWarnings()).toEqual([]);
  });

  it('invalid config の場合は fail-fast で blocker を返すこと', async () => {
    // Arrange
    const rootDir = await createTempRoot();
    await writeInvalidConfig(rootDir);
    process.chdir(rootDir);
    const adapter = new PhaseGateQueryAdapter();
    const scope = WriteTargetScope.create({ level: 3, unitId: 'example', storyId: 'H01-01' });

    // Act
    const actual = await adapter.checkGate(scope, 'scripts/harness/example/application/usecase.ts');

    // Assert
    expect(actual.hasPassed()).toBe(false);
    expect(actual.getBlockers()[0]).toContain('設定が不正です');
    expect(actual.getWarnings()).toEqual([]);
  });
});
