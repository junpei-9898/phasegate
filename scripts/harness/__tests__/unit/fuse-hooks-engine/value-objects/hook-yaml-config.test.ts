import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { HookYamlConfig } from '../../../../fuse-hooks-engine/domain/value-objects/hook-yaml-config.js';

target('HookYamlConfig', () => {
  it('UT-HF-052 有効なraw設定から生成できること', () => {
    // Arrange / Act
    const actual = HookYamlConfig.create({
      version: 1,
      hooks: [
        {
          type: 'pre-write',
          files: { include: ['**/*.env'] },
          action: { type: 'block-write', config: { reason: 'protected', notifyUser: true } },
        },
      ],
    });
    // Assert
    expect(actual.isOk()).toBe(true);
    expect(actual._unsafeUnwrap().hooks).toHaveLength(1);
  });

  it('UT-HF-053 hooksが配列でない場合にResult.failが返ること', () => {
    // Arrange / Act
    const actual = HookYamlConfig.create({ version: 1, hooks: null });
    // Assert
    expect(actual.isErr()).toBe(true);
  });
});
