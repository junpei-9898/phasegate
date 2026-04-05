import { describe, expect, it } from 'vitest';
import {
  GateStoryAnnotation,
  InvalidGateStoryAnnotationError,
} from '../../../phase-dependency-model/domain/values/gate-story-annotation.js';

describe('GateStoryAnnotation', () => {
  it('required と tag を保持できること', () => {
    // Arrange
    const input = { required: true, tag: '@story-id' };

    // Act
    const actual = GateStoryAnnotation.create(input);

    // Assert
    expect(actual.required).toBe(true);
    expect(actual.tag).toBe('@story-id');
  });

  it('tag が空文字の場合は拒否すること', () => {
    // Arrange
    const act = (): GateStoryAnnotation =>
      GateStoryAnnotation.create({ required: false, tag: '   ' });

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateStoryAnnotationError);
  });
});
