// @work-item-id WI-220
// @story H12-03
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
    it.each([false, true, undefined])('警告の拒否設定 %s と必要な両レイヤーを維持すること', async (failOnWarning) => {
      // Arrange
      const config = { paths: { designDocs: 'custom/design' }, layers: { L2: { enabled: false }, L3: { enabled: true } } };
      const diagnostics = ['L2', 'L3'].flatMap((layer) => ['error', 'warning'].map((severity) => ({
        code: `${layer}-${severity}`, severity, message: `${layer} ${severity}`, suggestion: 'fix',
      })));
      const execute = vi.fn().mockResolvedValue({ allErrors: diagnostics });
      createValidatorSystemModuleMock.mockReturnValue({ runFullValidationUseCase: { execute } });
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const adapter = new L2ValidatorSystemAdapter({ config, failOnWarning });

      // Act
      const actual = await adapter.validate(CommitMessage.create('skill-quality', 'WI-220', 'change'));

      // Assert
      expect(createValidatorSystemModuleMock).toHaveBeenCalledWith(config);
      expect(execute).toHaveBeenCalledWith({ targetPaths: [], unitName: '', currentPhase: '', includeL4: false, failOnWarning: failOnWarning ?? true });
      expect(actual).toEqual(diagnostics.filter((error) => failOnWarning !== false || error.severity !== 'warning')
        .map((error) => ({ ruleId: error.code, message: error.message, location: '' })));
      if (failOnWarning === false) {
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('L3-warning'));
      } else {
        expect(warning).not.toHaveBeenCalled();
      }
    });

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
