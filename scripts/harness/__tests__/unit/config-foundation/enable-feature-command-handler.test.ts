/**
 * @layer presentation
 * @unit config-foundation
 *
 * EnableFeatureCommandHandler のユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  EnableFeatureCommandHandler,
  type EnableFeatureCommandHandlerDeps,
} from '../../../config-foundation/presentation/cli/enable-feature-command-handler.js';

const createMockEnableFeatureUseCase = () => ({
  execute: vi.fn().mockResolvedValue({
    feature: 'bundleSizeLimit',
    enabled: true,
    configPath: '/tmp/phasegate.config.json',
  }),
});

const createMockListAvailableFeaturesUseCase = () => ({
  execute: vi.fn().mockResolvedValue([
    { name: 'bundleSizeLimit', enabled: false },
    { name: 'deadCodeGC', enabled: true },
  ]),
});

const createSut = () => {
  const enableFeatureUseCase = createMockEnableFeatureUseCase();
  const listAvailableFeaturesUseCase = createMockListAvailableFeaturesUseCase();
  const deps: EnableFeatureCommandHandlerDeps = {
    enableFeatureUseCase,
    listAvailableFeaturesUseCase,
  };
  return {
    enableFeatureUseCase,
    listAvailableFeaturesUseCase,
    sut: new EnableFeatureCommandHandler(deps),
  };
};

target('EnableFeatureCommandHandler.execute', () => {
  describe('feature enableコマンドを処理する', () => {
    context('featureName指定で有効化する場合', () => {
      it('exitCode 0と成功メッセージを返すこと', async () => {
        // Arrange
        const { sut, enableFeatureUseCase } = createSut();

        // Act
        const actual = await sut.execute({
          featureName: 'bundleSizeLimit',
          list: false,
          configPath: '/tmp/phasegate.config.json',
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain('bundleSizeLimit');
        expect(actual.output).toContain('enabled');
        expect(enableFeatureUseCase.execute).toHaveBeenCalledWith(
          'bundleSizeLimit',
          '/tmp/phasegate.config.json',
        );
      });
    });

    context('--list指定時', () => {
      it('exitCode 0と機能一覧を返すこと', async () => {
        // Arrange
        const { sut, listAvailableFeaturesUseCase } = createSut();

        // Act
        const actual = await sut.execute({
          list: true,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain('bundleSizeLimit');
        expect(actual.output).toContain('[disabled]');
        expect(actual.output).toContain('deadCodeGC');
        expect(actual.output).toContain('[enabled]');
        expect(listAvailableFeaturesUseCase.execute).toHaveBeenCalledTimes(1);
      });
    });

    context('featureNameが未指定かつ--listなしの場合', () => {
      it('exitCode 2とエラーメッセージを返すこと', async () => {
        // Arrange
        const { sut } = createSut();

        // Act
        const actual = await sut.execute({
          list: false,
        });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toContain('feature name is required');
      });
    });

    context('UseCaseが例外をスローする場合', () => {
      it('exitCode 2とエラーメッセージを返すこと', async () => {
        // Arrange
        const { sut, enableFeatureUseCase } = createSut();
        enableFeatureUseCase.execute.mockRejectedValue(
          new Error('Unsupported feature'),
        );

        // Act
        const actual = await sut.execute({
          featureName: 'unknownFeature',
          list: false,
        });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.output).toContain('Unsupported feature');
      });
    });
  });
});
