// @unit phase-dependency-model
// @layer integration

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { createConfigFoundationModule } from '../../../config-foundation/composition-root.js';
import { toPhaseConfigSection } from '../../../config-foundation/application/mappers/phase-config-section-mapper.js';
import { createPhaseDependencyModelModule } from '../../../phase-dependency-model/composition-root.js';

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'main-check-phase-gate-custom-'));
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

async function writePhaseGateConfig(rootDir: string): Promise<void> {
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

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

target('main check-phase-gate custom integration', () => {
  it('loadResolvedConfig と mapper を経由して custom gates が targetFilePath に適用されること', async () => {
    // Arrange
    const rootDir = await createTempRoot();
    await writePhaseGateConfig(rootDir);
    await ensureFile(rootDir, 'docs/product/user_stories.md', '# Stories\n- H01-01\n');
    await ensureFile(rootDir, 'docs/product/units/example_unit.md', 'Unit ID: example\n');
    await ensureFile(rootDir, 'docs/inception/example/H01-01/tdd_implementation_plan.md', '# plan\n');
    await ensureFile(
      rootDir,
      'scripts/harness/example/application/usecase.ts',
      '@story-id H01-01\nexport const value = 1;\n',
    );
    const configModule = createConfigFoundationModule();
    const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute(
      path.join(rootDir, 'phasegate.config.json'),
    );
    const phaseConfig = toPhaseConfigSection(resolvedConfig.config);
    const sut = createPhaseDependencyModelModule({
      rootDir,
      phaseConfig,
      reportOutputDir: resolvedConfig.config.reporting.outputDir,
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
});
