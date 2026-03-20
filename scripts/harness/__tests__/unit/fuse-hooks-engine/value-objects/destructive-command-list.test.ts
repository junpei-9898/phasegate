import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { DestructiveCommandList } from '../../../../fuse-hooks-engine/domain/value-objects/destructive-command-list.js';

target('DestructiveCommandList', () => {
  it('UT-HF-045 破壊的コマンドを検出できること', () => {
    // Arrange
    const sut = DestructiveCommandList.create([
      { command: 'rm', dangerousOptions: ['-rf', '-fr'] },
    ])._unsafeUnwrap();
    // Act
    const actual = sut.isDestructive('rm -rf node_modules');
    // Assert
    expect(actual).toBe(true);
  });
});
