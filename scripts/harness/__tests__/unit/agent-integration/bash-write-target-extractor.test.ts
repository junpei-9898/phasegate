/**
 * @layer domain
 * @unit agent-integration
 *
 * BashWriteTargetExtractor ドメインサービスのテスト
 */

import { describe, it, expect } from 'vitest';
import { BashWriteTargetExtractor } from '../../../agent-integration/domain/services/bash-write-target-extractor.js';

describe('BashWriteTargetExtractor', () => {
  describe('リダイレクト抽出', () => {
    it('`echo x > foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x > foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`echo x >> foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x >> foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`cat > foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cat > foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('heredoc 抽出', () => {
    it('`cat <<EOF > foo.ts ... EOF` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "cat <<EOF > foo.ts\nhello\nEOF";

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it("`cat <<'END' > foo.ts ... END` から foo.ts を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "cat <<'END' > foo.ts\nhello\nEND";

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('tee 抽出', () => {
    it('`echo x | tee foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x | tee foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`echo x | tee -a foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x | tee -a foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('sed -i 抽出', () => {
    it("`sed -i 's/a/b/' foo.ts` から foo.ts を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "sed -i 's/a/b/' foo.ts";

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it("`sed -i '' 's/a/b/' foo.ts` から foo.ts を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "sed -i '' 's/a/b/' foo.ts";

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('cp/mv 抽出', () => {
    it('`cp src.ts foo.ts` から foo.ts のみを抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cp src.ts foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`mv src.ts foo.ts` から foo.ts のみを抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'mv src.ts foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('touch 抽出', () => {
    it('`touch foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'touch foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('複合コマンド', () => {
    it('`mkdir -p dir && echo x > dir/foo.ts` から dir/foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'mkdir -p dir && echo x > dir/foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['dir/foo.ts']);
    });

    it('`ls; echo x > foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'ls; echo x > foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`cat src | tee foo.ts` から foo.ts を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cat src | tee foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('クォート対応', () => {
    it('`echo x > "path with spaces.ts"` から "path with spaces.ts" を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x > "path with spaces.ts"';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['path with spaces.ts']);
    });

    it("`echo x > 'foo.ts'` から foo.ts を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "echo x > 'foo.ts'";

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('抽出しないパターン', () => {
    it('`cat foo.ts` は空配列を返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cat foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });

    it('`pnpm test` は空配列を返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'pnpm test';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });

    it('`git status` は空配列を返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'git status';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });

    it('`ls -la` は空配列を返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'ls -la';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });

    it('`mkdir dir` は空配列を返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'mkdir dir';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });

    it('`rm foo.ts` は空配列を返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'rm foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('重複除去', () => {
    it('同じパスを複数回参照するコマンドは 1 回だけ返す', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x > foo.ts && echo y >> foo.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('複数ファイル抽出', () => {
    it('複数の異なるファイルへの書き込みは全て抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x > a.ts && echo y > b.ts';

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['a.ts', 'b.ts']);
    });
  });
});
