import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { ProtectedResourceList } from '../../../../fuse-hooks-engine/domain/value-objects/protected-resource-list.js';

target('ProtectedResourceList', () => {
  it('UT-HF-038 パターンに一致するパスを検出できること', () => {
    // Arrange
    const sut = ProtectedResourceList.create(['**/*.env'])._unsafeUnwrap();
    // Act
    const actual = sut.matches('.env');
    // Assert
    expect(actual).toBe(true);
  });
});
