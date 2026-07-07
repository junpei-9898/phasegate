/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

export type CommentDensityResult = {
  readonly commentLineCount: number;
  readonly logicalLineCount: number;
  readonly repeatedCommentBlocks: number;
};

const SINGLE_LINE_COMMENT = /^\s*\/\//;
const MULTI_LINE_COMMENT_START = /^\s*\/\*/;
const DOC_COMMENT_START = /^\s*\/\*\*/;
const MULTI_LINE_COMMENT_END = /\*\//;
const BLANK_LINE = /^\s*$/;
// L1 ルール (require-unit-comment / require-layer-comment) が必須化する
// 先頭メタデータヘッダのタグ行。ファイル冒頭の連続コメント領域でのみ効力を持つ。
const METADATA_HEADER_TAG = /^\s*\/\/\s*@(unit|layer|work-item-id|story|story-id|issue-id|module|feature|epic)\b/;

/**
 * ソースコードのコメント密度と繰り返しブロック数を算出する。
 *
 * WI-239: commentLineCount（密度分子）は「密度に寄与する narrative コメント行数」
 * を表すよう意味を再定義した。次は分子から除外する:
 *   - 先頭の必須メタデータヘッダ行（`// @unit` / `// @layer` / `// @work-item-id` /
 *     `// @story` 等。ファイル冒頭の連続コメント領域に限る）
 *   - `/** … *\/` doc-comment ブロック（ブロック全体）
 * 分子に残すのは narrative な `//` 行コメントと非 doc の `/* … *\/` ブロックのみ。
 *
 * - commentLineCount: 密度分子となる narrative コメント行数
 * - logicalLineCount: 空行を除いた行数（分母。定義不変）
 * - repeatedCommentBlocks: 連続する同一 narrative コメントブロックの検出回数
 */
export const parseCommentDensity = (sourceCode: string): CommentDensityResult => {
  const lines = sourceCode.split("\n");

  let commentLineCount = 0;
  let logicalLineCount = 0;
  let insideBlockComment = false;
  let insideDocComment = false;
  // ファイル冒頭の連続したメタデータヘッダ領域内かどうか。
  // 最初のコード行または非メタデータコメントが現れた時点で false になる。
  let insideHeaderZone = true;

  const commentBlocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (BLANK_LINE.test(line)) {
      flushBlock(currentBlock, commentBlocks);
      currentBlock = [];
      continue;
    }

    logicalLineCount += 1;

    if (insideBlockComment) {
      if (!insideDocComment) {
        commentLineCount += 1;
        currentBlock.push(line.trim());
      }

      if (MULTI_LINE_COMMENT_END.test(line)) {
        insideBlockComment = false;
        insideDocComment = false;
        flushBlock(currentBlock, commentBlocks);
        currentBlock = [];
      }

      continue;
    }

    if (SINGLE_LINE_COMMENT.test(line)) {
      const isMetadataHeader = insideHeaderZone && METADATA_HEADER_TAG.test(line);

      if (isMetadataHeader) {
        // メタデータヘッダは分子・反復検出のいずれにも寄与しない。
        continue;
      }

      // narrative な行コメントに到達 → ヘッダ領域は終了。
      insideHeaderZone = false;
      commentLineCount += 1;
      currentBlock.push(line.trim());
      continue;
    }

    if (MULTI_LINE_COMMENT_START.test(line)) {
      insideHeaderZone = false;
      const isDocComment = DOC_COMMENT_START.test(line);
      const isClosed = MULTI_LINE_COMMENT_END.test(line);

      if (isDocComment) {
        // doc-comment ブロックは分子・反復検出のいずれにも寄与しない。
        if (!isClosed) {
          insideBlockComment = true;
          insideDocComment = true;
        }
        continue;
      }

      commentLineCount += 1;
      currentBlock.push(line.trim());

      if (isClosed) {
        flushBlock(currentBlock, commentBlocks);
        currentBlock = [];
      } else {
        insideBlockComment = true;
      }

      continue;
    }

    insideHeaderZone = false;
    flushBlock(currentBlock, commentBlocks);
    currentBlock = [];
  }

  flushBlock(currentBlock, commentBlocks);

  const repeatedCommentBlocks = countRepeatedBlocks(commentBlocks);

  return { commentLineCount, logicalLineCount, repeatedCommentBlocks };
};

const flushBlock = (current: string[], blocks: string[]): void => {
  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }
};

const countRepeatedBlocks = (blocks: readonly string[]): number => {
  const seen = new Map<string, number>();

  for (const block of blocks) {
    seen.set(block, (seen.get(block) ?? 0) + 1);
  }

  let repeats = 0;

  for (const count of Array.from(seen.values())) {
    if (count > 1) {
      repeats += count - 1;
    }
  }

  return repeats;
};
