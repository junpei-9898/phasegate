// @unit phase-dependency-model
// @layer infrastructure

import { expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { PicomatchGlobMatcher } from '../../../phase-dependency-model/infrastructure/adapters/picomatch-glob-matcher.js';

target('PicomatchGlobMatcher', () => {
  it('foo 配下の再帰パターンに一致すること', () => {
    // Arrange
    const sut = new PicomatchGlobMatcher();

    // Act
    const actual = sut.match('foo/**', 'foo/bar/baz.ts');

    // Assert
    expect(actual).toBe(true);
  });

  it('単一階層の ts ファイルパターンに一致すること', () => {
    // Arrange
    const sut = new PicomatchGlobMatcher();

    // Act
    const actual = sut.match('foo/*.ts', 'foo/index.ts');

    // Assert
    expect(actual).toBe(true);
  });

  it('完全一致パターンに一致すること', () => {
    // Arrange
    const sut = new PicomatchGlobMatcher();

    // Act
    const actual = sut.match('foo/bar.ts', 'foo/bar.ts');

    // Assert
    expect(actual).toBe(true);
  });

  it('一致しないパスは false を返すこと', () => {
    // Arrange
    const sut = new PicomatchGlobMatcher();

    // Act
    const actual = sut.match('foo/*.ts', 'bar/index.ts');

    // Assert
    expect(actual).toBe(false);
  });

  it('複合拡張子パターンに一致すること', () => {
    // Arrange
    const sut = new PicomatchGlobMatcher();

    // Act
    const actual = sut.match('**/*.{ts,tsx}', 'src/components/button.tsx');

    // Assert
    expect(actual).toBe(true);
  });
});
