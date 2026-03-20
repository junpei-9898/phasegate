import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ShellWrapperAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/shell-wrapper-adapter.js';

target('ShellWrapperAdapter', () => {
  it('IT-HF-029 安全なコマンドを実行できること', async () => {
    // Arrange
    const sut = new ShellWrapperAdapter();
    // Act
    const actual = await sut.execute('echo hook', { failOnNonZero: true, timeout: 1000 });
    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('hook');
  });
});
