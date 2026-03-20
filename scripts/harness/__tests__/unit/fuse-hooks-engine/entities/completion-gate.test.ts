import { describe, expect, it } from 'vitest';
import { target } from '../../../helpers/test-helpers.js';
import { createMagicFile } from '../factories.js';
import { CompletionGate } from '../../../../fuse-hooks-engine/domain/entities/completion-gate.js';

target('CompletionGate', () => {
  it('UT-HF-078 passedに遷移するとcheckedAtが設定されること', () => {
    // Arrange
    const sut = CompletionGate.create('HF1-05', createMagicFile());
    sut.startCheck();
    // Act
    sut.passed();
    // Assert
    expect(sut.status).toBe('passed');
    expect(sut.checkedAt).not.toBeNull();
  });

  it('UT-HF-079 failedから再チェック可能なこと', () => {
    // Arrange
    const sut = CompletionGate.create('HF1-05', createMagicFile());
    sut.startCheck();
    sut.fail('missing');
    // Act
    const actual = sut.canRecheck();
    // Assert
    expect(actual).toBe(true);
  });
});
