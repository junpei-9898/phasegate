/**
 * @layer presentation
 * @unit harness-error
 *
 * RenderHarnessErrorsHandler のユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';
import { RenderHarnessErrorsHandler } from '../../../harness-error/presentation/handlers/render-harness-errors-handler.js';
import { HumanErrorFormatter } from '../../../harness-error/presentation/formatters/human-error-formatter.js';
import { AgentErrorFormatter } from '../../../harness-error/presentation/formatters/agent-error-formatter.js';
import { CiErrorFormatter } from '../../../harness-error/presentation/formatters/ci-error-formatter.js';

const createError = (
  overrides: Partial<HarnessErrorContract> = {},
): HarnessErrorContract => ({
  code: 'L1-001',
  severity: 'error',
  message: 'フェーズゲート違反',
  suggestion: 'ゲートを確認してください',
  ...overrides,
});

const createWarning = (
  overrides: Partial<HarnessErrorContract> = {},
): HarnessErrorContract => ({
  code: 'L1-002',
  severity: 'warning',
  message: 'アーキテクチャ警告',
  suggestion: 'レイヤー構成を見直してください',
  ...overrides,
});

const createSut = () => {
  const humanFormatter = new HumanErrorFormatter();
  const agentFormatter = new AgentErrorFormatter();
  const ciFormatter = new CiErrorFormatter();
  return new RenderHarnessErrorsHandler({
    humanFormatter,
    agentFormatter,
    ciFormatter,
  });
};

target('RenderHarnessErrorsHandler.execute', () => {
  describe('HarnessErrorContractを指定フォーマットで整形する', () => {
    context('humanフォーマット指定時', () => {
      it('テキスト形式で出力されること', () => {
        // Arrange
        const sut = createSut();
        const errors = [createError()];

        // Act
        const actual = sut.execute({
          errors,
          format: 'human',
          failOnError: false,
        });

        // Assert
        expect(actual.output).toContain('[ERROR]');
        expect(actual.output).toContain('L1-001');
        expect(actual.exitCode).toBe(0);
      });
    });

    context('agentフォーマット指定時', () => {
      it('JSON構造化データで出力されること', () => {
        // Arrange
        const sut = createSut();
        const errors = [createError()];

        // Act
        const actual = sut.execute({
          errors,
          format: 'agent',
          failOnError: false,
        });

        // Assert
        const parsed = JSON.parse(actual.output);
        expect(parsed.errors).toHaveLength(1);
        expect(parsed.summary.errorCount).toBe(1);
        expect(actual.exitCode).toBe(0);
      });
    });

    context('ciフォーマット指定時', () => {
      it('GitHub Actionsアノテーション形式で出力されること', () => {
        // Arrange
        const sut = createSut();
        const errors = [createError()];

        // Act
        const actual = sut.execute({
          errors,
          format: 'ci',
          failOnError: false,
        });

        // Assert
        expect(actual.output).toContain('::error');
        expect(actual.exitCode).toBe(0);
      });
    });

    context('--fail-on-error有効かつエラーが存在する場合', () => {
      it('exitCode 1を返すこと', () => {
        // Arrange
        const sut = createSut();
        const errors = [createError()];

        // Act
        const actual = sut.execute({
          errors,
          format: 'human',
          failOnError: true,
        });

        // Assert
        expect(actual.exitCode).toBe(1);
      });
    });

    context('--fail-on-error有効だがwarningのみの場合', () => {
      it('exitCode 0を返すこと', () => {
        // Arrange
        const sut = createSut();
        const errors = [createWarning()];

        // Act
        const actual = sut.execute({
          errors,
          format: 'human',
          failOnError: true,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('エラーが空配列の場合', () => {
      it('exitCode 0を返すこと', () => {
        // Arrange
        const sut = createSut();

        // Act
        const actual = sut.execute({
          errors: [],
          format: 'human',
          failOnError: true,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.output).toContain('No errors found');
      });
    });
  });
});
