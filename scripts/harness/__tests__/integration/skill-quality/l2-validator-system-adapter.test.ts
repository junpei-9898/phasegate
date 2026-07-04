// @unit skill-quality
// @layer test

import { afterEach, describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { L2ValidatorSystemAdapter } from '../../../skill-quality/infrastructure/adapters/l2-validator-system-adapter.js';
import { CommitMessage } from '../../../skill-quality/domain/value-objects/commit-message.js';

const createValidatorSystemModuleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../validator-system/composition-root.js', () => ({
  createValidatorSystemModule: createValidatorSystemModuleMock,
}));

target('L2ValidatorSystemAdapter (fail-closed)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createValidatorSystemModuleMock.mockReset();
  });

  describe('validate', () => {
    context('依存する validator-system の生成が例外を投げる場合', () => {
      it('合格扱いにせず、L2-VALIDATOR-ERROR の違反を1件以上返すこと', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createValidatorSystemModuleMock.mockImplementation(() => {
          throw new Error('validator-system boom');
        });
        const adapter = new L2ValidatorSystemAdapter();
        const commitMessage = CommitMessage.create('skill-quality', 'H12-01', 'テスト用コミット');

        // Act
        const actual = await adapter.validate(commitMessage);

        // Assert
        expect(actual.length).toBe(1);
        expect(actual[0].ruleId).toBe('L2-VALIDATOR-ERROR');
        expect(actual[0].message).toContain('validator-system boom');
      });
    });

    context('検証実行 (runFullValidationUseCase.execute) が例外を投げる場合', () => {
      it('合格扱いにせず、原因メッセージを含む違反を返すこと', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createValidatorSystemModuleMock.mockReturnValue({
          runFullValidationUseCase: {
            execute: vi.fn().mockRejectedValue(new Error('full validation crashed')),
          },
        });
        const adapter = new L2ValidatorSystemAdapter();
        const commitMessage = CommitMessage.create('skill-quality', 'H12-01', 'テスト用コミット');

        // Act
        const actual = await adapter.validate(commitMessage);

        // Assert
        expect(actual.length).toBe(1);
        expect(actual[0].ruleId).toBe('L2-VALIDATOR-ERROR');
        expect(actual[0].message).toContain('full validation crashed');
      });
    });
  });
});
