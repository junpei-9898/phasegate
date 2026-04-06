// @layer test
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { initHarnessConfig } from '../../../setup/skill-deployer.js';

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'skill-deployer-test-'));

  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function readGeneratedConfig(projectRoot: string): Promise<{
  phaseDependencies: { preset: string };
}> {
  const raw = await readFile(join(projectRoot, 'phasegate.config.json'), 'utf-8');
  return JSON.parse(raw) as { phaseDependencies: { preset: string } };
}

target('initHarnessConfig', () => {
  describe('phaseDependencies.preset を生成する', () => {
    context('phasePreset を指定しない場合', () => {
      it('default が書き込まれること', async () => {
        // Arrange
        const projectName = 'my-project';

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName);
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe('default');
      });
    });

    context('phasePreset に full を指定する場合', () => {
      it('full が書き込まれること', async () => {
        // Arrange
        const projectName = 'my-project';

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, 'full');
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe('full');
      });
    });

    context('phasePreset に standard を指定する場合', () => {
      it('standard が書き込まれること', async () => {
        // Arrange
        const projectName = 'my-project';

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, 'standard');
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe('standard');
      });
    });

    context('phasePreset に custom を指定する場合', () => {
      it('custom が書き込まれること', async () => {
        // Arrange
        const projectName = 'my-project';

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, 'custom');
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe('custom');
      });
    });
  });
});
