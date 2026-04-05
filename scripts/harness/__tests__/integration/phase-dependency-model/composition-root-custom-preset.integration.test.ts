// @unit phase-dependency-model
// @layer infrastructure

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { createPhaseDependencyModelModule } from '../../../phase-dependency-model/composition-root.js';

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'phase-dependency-custom-'));
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

function createCustomPhaseConfig() {
  return {
    customization: {
      preset: 'custom',
      overrideEnabled: false,
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
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

target('custom preset composition root integration', () => {
  it('config の gates から parser と real verifier を通してゲート通過できること', async () => {
    // Arrange
    const rootDir = await createTempRoot();
    await ensureFile(rootDir, 'docs/product/user_stories.md', '# Stories\n- H01-01\n');
    await ensureFile(rootDir, 'docs/product/units/example_unit.md', 'Unit ID: example\n');
    await ensureFile(
      rootDir,
      'docs/inception/example/H01-01/tdd_implementation_plan.md',
      '# plan\n',
    );
    await ensureFile(
      rootDir,
      'scripts/harness/example/application/usecase.ts',
      '@story-id H01-01\nexport const value = 1;\n',
    );
    const sut = createPhaseDependencyModelModule({
      rootDir,
      phaseConfig: createCustomPhaseConfig(),
    });

    // Act
    const actual = await sut.checkPhaseGateCommandHandler.execute({
      targetLevel: 3,
      unitId: 'example',
      storyId: 'H01-01',
      targetFilePath: 'scripts/harness/example/application/usecase.ts',
    });

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.result?.passed).toBe(true);
    expect(actual.result?.blockers).toEqual([]);
  });

  it('注釈が欠落している場合は custom preset でも blocker になること', async () => {
    // Arrange
    const rootDir = await createTempRoot();
    await ensureFile(rootDir, 'docs/product/user_stories.md', '# Stories\n- H01-01\n');
    await ensureFile(rootDir, 'docs/product/units/example_unit.md', 'Unit ID: example\n');
    await ensureFile(
      rootDir,
      'docs/inception/example/H01-01/tdd_implementation_plan.md',
      '# plan\n',
    );
    await ensureFile(
      rootDir,
      'scripts/harness/example/application/usecase.ts',
      'export const value = 1;\n',
    );
    const sut = createPhaseDependencyModelModule({
      rootDir,
      phaseConfig: createCustomPhaseConfig(),
    });

    // Act
    const actual = await sut.checkPhaseGateCommandHandler.execute({
      targetLevel: 3,
      unitId: 'example',
      storyId: 'H01-01',
      targetFilePath: 'scripts/harness/example/application/usecase.ts',
    });

    // Assert
    expect(actual.exitCode).toBe(1);
    expect(actual.result?.passed).toBe(false);
    expect(actual.result?.blockers).toEqual([
      'story-implementor: @story-id 注釈が必要です (scripts/harness/example/application/usecase.ts)',
    ]);
  });
});
