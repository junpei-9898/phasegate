// @layer test
// @unit quick-mode
// @story H10-06
// @work-item-id WI-015

import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers.js';
import { isCommentOnlyDiff } from '../../../../../quick-mode/domain/services/comment-only-diff-detector.js';
import { ChangedFile } from '../../../../../quick-mode/domain/value-objects/changed-file.js';

function createChangedSource(beforeContent: string | null, afterContent: string | null) {
  return ChangedFile.create({
    filePath: 'scripts/harness/example/domain/ports/example-port.ts',
    changeKind: 'MODIFY',
    beforeContent,
    afterContent,
  });
}

target('isCommentOnlyDiff', () => {
  describe('コメントまたは空白のみの差分を判定する', () => {
    context('行コメントだけが追加される場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const file = createChangedSource(
          'export interface Example {\n  run(): void;\n}\n',
          '// note\nexport interface Example {\n  run(): void;\n}\n',
        );
        // Act
        const actual = isCommentOnlyDiff(file);
        // Assert
        expect(actual).toBe(true);
      });
    });

    context('JSDocだけが削除される場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const file = createChangedSource(
          '/** Example port */\nexport interface Example {\n  run(): void;\n}\n',
          'export interface Example {\n  run(): void;\n}\n',
        );
        // Act
        const actual = isCommentOnlyDiff(file);
        // Assert
        expect(actual).toBe(true);
      });
    });

    context('空白だけが変わる場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const file = createChangedSource('export interface Example { run(): void; }\n', 'export   interface Example {\nrun(): void;\n}\n');
        // Act
        const actual = isCommentOnlyDiff(file);
        // Assert
        expect(actual).toBe(true);
      });
    });

    context('interfaceの戻り値型が変わる場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const file = createChangedSource(
          'export interface Example { run(): void; }\n',
          'export interface Example { run(): Promise<void>; }\n',
        );
        // Act
        const actual = isCommentOnlyDiff(file);
        // Assert
        expect(actual).toBe(false);
      });
    });

    context('文字列リテラル内のコメント風文字列が変わる場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const file = createChangedSource(
          'export const value = "https://example.test/a";\n',
          'export const value = "https://example.test/b";\n',
        );
        // Act
        const actual = isCommentOnlyDiff(file);
        // Assert
        expect(actual).toBe(false);
      });
    });

    context('beforeContentまたはafterContentがない場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const file = createChangedSource(null, 'export interface Example {}\n');
        // Act
        const actual = isCommentOnlyDiff(file);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
