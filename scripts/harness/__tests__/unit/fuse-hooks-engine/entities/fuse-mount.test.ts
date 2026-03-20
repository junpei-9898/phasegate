import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { FUSEMount } from '../../../../fuse-hooks-engine/domain/entities/fuse-mount.js';

target('FUSEMount', () => {
  it('UT-HF-070 fallbackへ遷移できること', () => {
    // Arrange
    const sut = FUSEMount.create('/project/root');
    // Act
    sut.enterFallback('L3');
    // Assert
    expect(sut.isFallback()).toBe(true);
    expect(sut.getFallbackMode()).toBe('L3');
  });
});
