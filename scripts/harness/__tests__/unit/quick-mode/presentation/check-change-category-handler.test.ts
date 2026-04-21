// @layer test
// @unit quick-mode
// @story H10-05
import { describe, expect, it, vi } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { CheckChangeCategoryHandler } from '../../../../quick-mode/presentation/handlers/check-change-category-handler.js';
import type { ClassifyChangeCategoryUseCase } from '../../../../quick-mode/application/usecases/classify-change-category-usecase.js';
import type { ChangeCategoryClassificationContract } from '../../../../quick-mode/application/dto/change-category-classification-contract.js';

const buildSut = (contract: ChangeCategoryClassificationContract) => {
  const useCase: Pick<ClassifyChangeCategoryUseCase, 'execute'> = {
    execute: vi.fn().mockResolvedValue(contract),
  };
  const writes: string[] = [];
  const writer = (s: string) => {
    writes.push(s);
  };
  const sut = new CheckChangeCategoryHandler({ useCase, writer });
  return { sut, useCase, writes };
};

target('CheckChangeCategoryHandler', () => {
  target('handle', () => {
    describe('paths の解析と出力', () => {
      // UT-HCC-001
      it('--paths を , 区切りでパースして UseCase に渡すこと', async () => {
        // Arrange
        const { sut, useCase } = buildSut({
          dominantCategory: 'bugfix',
          perFile: [],
          fullModeRequired: false,
        });
        // Act
        await sut.handle({ paths: 'src/foo.ts, src/bar.ts' });
        // Assert
        expect(useCase.execute).toHaveBeenCalledWith({
          paths: ['src/foo.ts', 'src/bar.ts'],
        });
      });

      // UT-HCC-002
      it('--paths が未指定の場合に空配列を UseCase に渡すこと', async () => {
        // Arrange
        const { sut, useCase } = buildSut({
          dominantCategory: null,
          perFile: [],
          fullModeRequired: false,
        });
        // Act
        await sut.handle({});
        // Assert
        expect(useCase.execute).toHaveBeenCalledWith({ paths: [] });
      });

      // UT-HCC-003
      it('format=json の場合に JSON 文字列を書き出すこと', async () => {
        // Arrange
        const { sut, writes } = buildSut({
          dominantCategory: 'domain',
          perFile: [{ path: 'domain/foo.ts', category: 'domain' }],
          fullModeRequired: true,
          rejectionRule: 'MIXED_CHANGES',
          rejectionReason: 'domain カテゴリが含まれる',
        });
        // Act
        await sut.handle({ paths: 'domain/foo.ts', format: 'json' });
        // Assert
        const output = writes.join('');
        const parsed = JSON.parse(output);
        expect(parsed.fullModeRequired).toBe(true);
        expect(parsed.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-HCC-004
      it('format=human（デフォルト）の場合にテキスト整形された出力を書き出すこと', async () => {
        // Arrange
        const { sut, writes } = buildSut({
          dominantCategory: 'bugfix',
          perFile: [{ path: 'src/foo.ts', category: 'bugfix' }],
          fullModeRequired: false,
        });
        // Act
        await sut.handle({ paths: 'src/foo.ts' });
        // Assert
        const output = writes.join('');
        expect(output).toContain('dominantCategory: bugfix');
        expect(output).toContain('fullModeRequired: false');
      });
    });

    describe('終了コード', () => {
      // UT-HCC-005
      it('failOnFullRequired=true かつ fullModeRequired=true の場合に exitCode=1 が返ること', async () => {
        // Arrange
        const { sut } = buildSut({
          dominantCategory: 'domain',
          perFile: [],
          fullModeRequired: true,
          rejectionRule: 'MIXED_CHANGES',
        });
        // Act
        const actual = await sut.handle({
          paths: 'domain/foo.ts',
          failOnFullRequired: true,
        });
        // Assert
        expect(actual.exitCode).toBe(1);
      });

      // UT-HCC-006
      it('failOnFullRequired=false （デフォルト）の場合に fullModeRequired=true でも exitCode=0 が返ること', async () => {
        // Arrange
        const { sut } = buildSut({
          dominantCategory: 'domain',
          perFile: [],
          fullModeRequired: true,
          rejectionRule: 'MIXED_CHANGES',
        });
        // Act
        const actual = await sut.handle({ paths: 'domain/foo.ts' });
        // Assert
        expect(actual.exitCode).toBe(0);
      });

      // UT-HCC-007
      it('fullModeRequired=false の場合に failOnFullRequired=true でも exitCode=0 が返ること', async () => {
        // Arrange
        const { sut } = buildSut({
          dominantCategory: 'bugfix',
          perFile: [],
          fullModeRequired: false,
        });
        // Act
        const actual = await sut.handle({
          paths: 'src/foo.ts',
          failOnFullRequired: true,
        });
        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });
  });
});
