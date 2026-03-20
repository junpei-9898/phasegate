import { describe, expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ValidateHookYamlUseCase } from '../../../fuse-hooks-engine/application/usecases/validate-hook-yaml-usecase.js';

target('ValidateHookYamlUseCase', () => {
  it('IT-HF-020 readerが成功すればvalid=trueが返ること', async () => {
    // Arrange
    const reader = {
      read: vi.fn().mockResolvedValue({ isOk: () => true }),
    };
    const sut = new ValidateHookYamlUseCase(reader as never);
    // Act
    const actual = await sut.execute({ yamlPath: '.harness-hooks.yml' });
    // Assert
    expect(actual.valid).toBe(true);
  });
});
