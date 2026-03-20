import { beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { GenerateE2ETemplateUseCase } from '../../../phase2-extensions/application/usecases/generate-e2e-template-usecase.js';

target('IT-P2-003 GenerateE2ETemplateUseCase', () => {
  let useCase: GenerateE2ETemplateUseCase;

  beforeEach(() => {
    useCase = new GenerateE2ETemplateUseCase();
  });

  context('execute()', () => {
    it('targetPhase="wave1" でテンプレートが生成される', async () => {
      // Arrange
      const input = { targetPhase: 'wave1' };
      // Act
      const actual = await useCase.execute(input);
      // Assert
      expect(actual.templateContent).toContain('wave1');
      expect(actual.errors).toHaveLength(0);
    });

    it('targetPhase が空文字のとき errors に値が含まれる', async () => {
      // Arrange
      const input = { targetPhase: '' };
      // Act
      const actual = await useCase.execute(input);
      // Assert
      expect(actual.errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});
