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

    it('標準エラーから標準出力への fd 複製は書き込み先を抽出しない', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cat x.log 2>&1';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual([]);
    });

    it('パイプの前にある fd 複製は書き込み先を抽出しない', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'npm test 2>&1 | tail -5';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual([]);
    });

    it('標準出力から標準エラーへの fd 複製は書き込み先を抽出しない', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo hi >&2';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual([]);
    });

    it('fd 指定の標準エラー実ファイルは書き込み先として抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cmd 2> err.log';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['err.log']);
    });

    it('実ファイル出力と fd 複製が併用された場合は実ファイルだけを抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cmd > out.log 2>&1';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['out.log']);
    });

    it('csh 形式の標準出力と標準エラーの実ファイル出力は書き込み先を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'cmd >& combined.log';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['combined.log']);
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

  describe('apply_patch 抽出', () => {
    it('`*** Update File: foo.ts` のパスを抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: foo.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`*** Add File: new.ts` のパスを抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Add File: new.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['new.ts']);
    });

    it('`*** Delete File: old.ts` のパスを抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Delete File: old.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['old.ts']);
    });

    it('1つの apply_patch 内で Update / Add / Delete 混在ケースを全て抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: a.ts
*** Add File: b.ts
*** Delete File: c.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['a.ts', 'b.ts', 'c.ts']);
    });

    it('heredoc が `<<EOF` (unquoted) でも抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<EOF
*** Begin Patch
*** Update File: foo.ts
*** End Patch
EOF`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('heredoc が `<<"EOF"` (double-quoted) でも抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<"EOF"
*** Begin Patch
*** Update File: foo.ts
*** End Patch
EOF`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('パスにスペースを含むファイルも抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: path with spaces.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['path with spaces.ts']);
    });

    it('`*** Update File: foo.ts   ` の末尾空白をトリムする', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: foo.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`*** End Patch` が欠けていても command 末尾までをブロックとして扱う', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: foo.ts
`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('apply_patch 複合コマンド', () => {
    it('`cd /tmp && apply_patch ...` から抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `cd /tmp && apply_patch <<'PATCH'
*** Begin Patch
*** Update File: foo.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });

    it('`apply_patch ... && echo done` から抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH' && echo done
*** Begin Patch
*** Update File: foo.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['foo.ts']);
    });
  });

  describe('apply_patch と既存抽出の統合', () => {
    it('`apply_patch` と `echo > file` の両方から抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `echo x > log.txt && apply_patch <<'PATCH'
*** Begin Patch
*** Add File: new.ts
*** End Patch
PATCH`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual(['log.txt', 'new.ts']);
    });
  });

  describe('clobber リダイレクト `>|` 抽出 (P-4 回帰)', () => {
    it('`echo x >| scripts/harness/x/domain/evil.ts` から対象を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x >| scripts/harness/x/domain/evil.ts';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['scripts/harness/x/domain/evil.ts']);
    });

    it('スペース無し `echo x >|foo.ts` でも抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'echo x >|foo.ts';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['foo.ts']);
    });
  });

  describe('dd of= 抽出 (P-4 回帰)', () => {
    it('`dd if=/dev/zero of=scripts/harness/x/domain/evil.ts` から of= 対象を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'dd if=/dev/zero of=scripts/harness/x/domain/evil.ts';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['scripts/harness/x/domain/evil.ts']);
    });

    it('`dd of=foo.ts bs=1M` の順序が入れ替わっても抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'dd of=foo.ts bs=1M if=/dev/zero';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['foo.ts']);
    });
  });

  describe('install 抽出 (P-4 回帰)', () => {
    it('`install src.ts scripts/harness/x/domain/evil.ts` から宛先を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'install src.ts scripts/harness/x/domain/evil.ts';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['scripts/harness/x/domain/evil.ts']);
    });

    it('`install -m 644 src.ts dest.ts` からオプションを除き宛先のみ抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'install -m 644 src.ts dest.ts';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['dest.ts']);
    });
  });

  describe('rsync 抽出 (P-4 回帰)', () => {
    it('`rsync -a src.ts scripts/harness/x/domain/evil.ts` から宛先を抽出する', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = 'rsync -a src.ts scripts/harness/x/domain/evil.ts';

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['scripts/harness/x/domain/evil.ts']);
    });
  });

  describe('bash -c ネスト抽出 (P-4 回帰)', () => {
    it("`bash -c 'echo x > scripts/harness/x/domain/evil.ts'` からネスト内の対象を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "bash -c 'echo x > scripts/harness/x/domain/evil.ts'";

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['scripts/harness/x/domain/evil.ts']);
    });

    it("`sh -c 'touch foo.ts'` からネスト内の touch 対象を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "sh -c 'touch foo.ts'";

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['foo.ts']);
    });

    it("`bash -c 'dd of=evil.ts && cp a b'` からネスト内の複数 write vector を抽出する", () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = "bash -c 'dd of=evil.ts && cp a b'";

      // Act
      const actual = extractor.extract(command);

      // Assert
      expect(actual).toEqual(['evil.ts', 'b']);
    });
  });

  describe('apply_patch 抽出しないパターン', () => {
    it('`*** Begin Patch` マーカー無しで `*** Update File:` を含むのみの場合は抽出しない', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `echo '*** Update File: foo.ts'`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toEqual([]);
    });

    it('`*** Begin Patch` / `*** End Patch` ブロックの外にある `*** Update File:` は抽出しない', () => {
      // Arrange
      const extractor = new BashWriteTargetExtractor();
      const command = `apply_patch <<'PATCH'
*** Begin Patch
*** Update File: real.ts
*** End Patch
PATCH
echo '*** Update File: fake.ts'`;

      // Act
      const result = extractor.extract(command);

      // Assert
      expect(result).toContain('real.ts');
      expect(result).not.toContain('fake.ts');
    });
  });
});
