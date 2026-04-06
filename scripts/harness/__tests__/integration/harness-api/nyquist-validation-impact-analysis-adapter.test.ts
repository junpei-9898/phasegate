// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  NyquistValidationImpactAnalysisAdapter,
  type INyquistValidationStub,
} from '../../../harness-api/infrastructure/adapters/nyquist-validation-impact-analysis-adapter.js';

target('NyquistValidationImpactAnalysisAdapter', () => {
  // ─── IT-Adapter-ImpactAnalysis-001 ───
  describe('有効なstoryIdで影響分析結果が返されること', () => {
    context("stubがstoryId='H09-01'のImpactAnalysisResultを返す場合", () => {
      it('ImpactAnalysisResultがそのまま返される', async () => {
        // Arrange
        const stub: INyquistValidationStub = {
          analyzeImpact: vi.fn().mockResolvedValue({
            storyId: 'H09-01',
            affectedTestCases: ['IT-UC-DispatchCmd-001', 'UT-DS-001'],
            affectedFiles: ['dispatch-command-usecase.ts'],
          }),
        };
        const adapter = new NyquistValidationImpactAnalysisAdapter(stub);

        // Act
        const actual = await adapter.analyze('H09-01');

        // Assert
        expect(actual).not.toBeNull();
        expect(actual?.storyId).toBe('H09-01');
        expect(actual?.affectedTestCases).toHaveLength(2);
      });
    });
  });

  // ─── IT-Adapter-ImpactAnalysis-002 ───
  describe('スタブがnullを返す場合、nullが返されること', () => {
    context("stubがnullを返す場合（影響なし）", () => {
      it('nullが返される', async () => {
        // Arrange
        const stub: INyquistValidationStub = {
          analyzeImpact: vi.fn().mockResolvedValue(null),
        };
        const adapter = new NyquistValidationImpactAnalysisAdapter(stub);

        // Act
        const actual = await adapter.analyze('H09-02');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // ─── IT-Adapter-ImpactAnalysis-003 ───
  describe('無効なstoryId形式の場合、HarnessApiDomainErrorがスローされること', () => {
    context("storyId='invalid-id'（HXX-XX形式でない）を渡した場合", () => {
      it('HarnessApiDomainErrorメッセージを含むエラーがスローされる', async () => {
        // Arrange
        const stub: INyquistValidationStub = {
          analyzeImpact: vi.fn(),
        };
        const adapter = new NyquistValidationImpactAnalysisAdapter(stub);

        // Act & Assert
        await expect(adapter.analyze('invalid-id')).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });

  // ─── IT-Adapter-ImpactAnalysis-004 ───
  describe('短すぎるstoryId形式の場合、HarnessApiDomainErrorがスローされること', () => {
    context("storyId='H9-1'（桁数不足）を渡した場合", () => {
      it('HarnessApiDomainErrorメッセージを含むエラーがスローされる', async () => {
        // Arrange
        const stub: INyquistValidationStub = {
          analyzeImpact: vi.fn(),
        };
        const adapter = new NyquistValidationImpactAnalysisAdapter(stub);

        // Act & Assert
        await expect(adapter.analyze('H9-1')).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });

  // ─── IT-Adapter-ImpactAnalysis-005 ───
  describe('スタブ未指定（デフォルト）の場合、nullを返すこと', () => {
    context('コンストラクタ引数なしで生成した場合', () => {
      it('analyze(H01-01)がnullを返す', async () => {
        // Arrange
        const adapter = new NyquistValidationImpactAnalysisAdapter();

        // Act
        const actual = await adapter.analyze('H01-01');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
