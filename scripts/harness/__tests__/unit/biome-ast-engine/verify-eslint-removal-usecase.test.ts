import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { WorkspaceInventoryPort } from '../../../biome-ast-engine/domain/ports/workspace-inventory-port.js';
import {
  LegacyEslintArtifactDetectedError,
  VerifyEslintRemovalUseCase,
} from '../../../biome-ast-engine/application/usecases/verify-eslint-removal-usecase.ts';

const createSut = (artifacts: {
  configFiles: readonly string[];
  packageDependencies: readonly string[];
}) => {
  const workspaceInventoryPort: WorkspaceInventoryPort = {
    findLegacyEslintArtifacts: vi.fn().mockResolvedValue(artifacts),
  };

  return {
    workspaceInventoryPort,
    sut: new VerifyEslintRemovalUseCase({
      workspaceInventoryPort,
    }),
  };
};

target('VerifyEslintRemovalUseCase.execute', () => {
  describe('ESLint残存資産を検査する', () => {
    context('ESLint設定ファイルが残っている場合', () => {
      it('configFilesを返しhasLegacyArtifactsがtrueになる', async () => {
        // Arrange
        const { sut } = createSut({
          configFiles: ['eslint.config.js'],
          packageDependencies: [],
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.configFiles).toEqual(['eslint.config.js']);
        expect(actual.packageDependencies).toEqual([]);
        expect(actual.hasLegacyArtifacts).toBe(true);
      });
    });

    context('パッケージ依存だけが残っている場合', () => {
      it('packageDependenciesを返しhasLegacyArtifactsがtrueになる', async () => {
        // Arrange
        const { sut } = createSut({
          configFiles: [],
          packageDependencies: ['@typescript-eslint/eslint-plugin'],
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.configFiles).toEqual([]);
        expect(actual.packageDependencies).toEqual(['@typescript-eslint/eslint-plugin']);
        expect(actual.hasLegacyArtifacts).toBe(true);
      });
    });

    context('残存資産がない場合', () => {
      it('空配列を返しhasLegacyArtifactsがfalseになる', async () => {
        // Arrange
        const { sut } = createSut({
          configFiles: [],
          packageDependencies: [],
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.configFiles).toEqual([]);
        expect(actual.packageDependencies).toEqual([]);
        expect(actual.hasLegacyArtifacts).toBe(false);
      });
    });

    context('failOnLegacyArtifactsがtrueで残存がある場合', () => {
      it('LegacyEslintArtifactDetectedErrorが送出される', async () => {
        // Arrange
        const { sut } = createSut({
          configFiles: ['.eslintrc.cjs'],
          packageDependencies: [],
        });

        // Act
        const actual = sut.execute({ failOnLegacyArtifacts: true });

        // Assert
        await expect(actual).rejects.toThrow(LegacyEslintArtifactDetectedError);
      });
    });
  });
});
