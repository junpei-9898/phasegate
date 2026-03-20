import { describe, expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { LoadHookConfigUseCase } from '../../../fuse-hooks-engine/application/usecases/load-hook-config-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { HookYamlConfig } from '../../../fuse-hooks-engine/domain/value-objects/hook-yaml-config.js';

target('LoadHookConfigUseCase', () => {
  it('IT-HF-001 有効な設定をロードするとHookDefinitionが返ること', async () => {
    // Arrange
    const config = HookYamlConfig.create({
      version: 1,
      hooks: [
        {
          type: 'pre-write',
          files: { include: ['**/*.env'] },
          action: { type: 'block-write', config: { reason: 'Protected', notifyUser: true } },
        },
      ],
      protectedResources: ['**/*.env'],
    })._unsafeUnwrap();
    const reader = {
      read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => config }),
    };
    const sut = new LoadHookConfigUseCase(reader as never, new HookEvaluationService());
    // Act
    const actual = await sut.execute({ yamlPath: '.harness-hooks.yml' });
    // Assert
    expect(actual.definitions).toHaveLength(1);
    expect(actual.protectedResources).toEqual(['**/*.env']);
    expect(actual.errors).toHaveLength(0);
  });
});
