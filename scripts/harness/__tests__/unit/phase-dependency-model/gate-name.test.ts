// @layer test
import { describe, expect, it } from 'vitest';
import {
  GateName,
  InvalidGateNameError,
} from '../../../phase-dependency-model/domain/values/gate-name.js';

describe('GateName', () => {
  it('kebab-case のゲート名を生成できること', () => {
    // Arrange
    const input = 'story-implementor';

    // Act
    const actual = GateName.create(input);

    // Assert
    expect(actual.value).toBe(input);
  });

  it('空文字を拒否すること', () => {
    // Arrange
    const act = (): GateName => GateName.create('');

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateNameError);
  });

  it('先頭が数字の名前を拒否すること', () => {
    // Arrange
    const act = (): GateName => GateName.create('3-story');

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateNameError);
  });

  it('大文字を含む名前を拒否すること', () => {
    // Arrange
    const act = (): GateName => GateName.create('Story-implementor');

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateNameError);
  });

  it('末尾ハイフンの名前を拒否すること', () => {
    // Arrange
    const act = (): GateName => GateName.create('story-');

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateNameError);
  });
});
