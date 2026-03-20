import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { createOnCompleteHookDefinition, createPreWriteHookDefinition } from '../factories.js';
import { HookEvaluationService } from '../../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';

target('HookEvaluationService', () => {
  it('UT-HF-085 マッチする定義のアクションのみ返すこと', () => {
    // Arrange
    const sut = new HookEvaluationService();
    const definitions = [
      createPreWriteHookDefinition({ includePatterns: ['**/*.env'] }),
      createOnCompleteHookDefinition(),
    ];
    // Act
    const actual = sut.evaluate('.env', 'write', definitions);
    // Assert
    expect(actual).toHaveLength(1);
    expect(actual[0].actionType).toBe('block-write');
  });
});
