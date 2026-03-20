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
const MULTI_LINE_COMMENT_END = /\*\//;
const BLANK_LINE = /^\s*$/;

/**
 * ソースコードのコメント密度と繰り返しブロック数を算出する。
 *
 * - commentLineCount: コメント行数（単一行・複数行両方）
 * - logicalLineCount: 空行を除いた行数
 * - repeatedCommentBlocks: 連続する同一コメントブロックの検出回数
 */
export const parseCommentDensity = (sourceCode: string): CommentDensityResult => {
  const lines = sourceCode.split('\n');

  let commentLineCount = 0;
  let logicalLineCount = 0;
  let insideBlockComment = false;

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
      commentLineCount += 1;
      currentBlock.push(line.trim());

      if (MULTI_LINE_COMMENT_END.test(line)) {
        insideBlockComment = false;
        flushBlock(currentBlock, commentBlocks);
        currentBlock = [];
      }

      continue;
    }

    if (SINGLE_LINE_COMMENT.test(line)) {
      commentLineCount += 1;
      currentBlock.push(line.trim());
      continue;
    }

    if (MULTI_LINE_COMMENT_START.test(line)) {
      commentLineCount += 1;
      insideBlockComment = true;
      currentBlock.push(line.trim());

      if (MULTI_LINE_COMMENT_END.test(line)) {
        insideBlockComment = false;
        flushBlock(currentBlock, commentBlocks);
        currentBlock = [];
      }

      continue;
    }

    flushBlock(currentBlock, commentBlocks);
    currentBlock = [];
  }

  flushBlock(currentBlock, commentBlocks);

  const repeatedCommentBlocks = countRepeatedBlocks(commentBlocks);

  return { commentLineCount, logicalLineCount, repeatedCommentBlocks };
};

const flushBlock = (current: string[], blocks: string[]): void => {
  if (current.length > 0) {
    blocks.push(current.join('\n'));
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
