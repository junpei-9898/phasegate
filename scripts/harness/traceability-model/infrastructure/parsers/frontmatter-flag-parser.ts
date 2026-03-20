/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * 設計文書先頭のYAML frontmatterから traceability.initial_creation を抽出するパーサー。
 * gray-matterに依存せず正規表現で処理する。
 */

export interface ParsedFrontmatterFlags {
  readonly initialCreation: boolean;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;
const INITIAL_CREATION_PATTERN =
  /^\s*initial_creation\s*:\s*(true|false)\s*$/m;
const TRACEABILITY_BLOCK_PATTERN =
  /traceability\s*:\s*\r?\n((?:\s+.+\r?\n?)*)/;

/**
 * Markdown先頭のfrontmatterから traceability.initial_creation フラグを抽出する。
 *
 * - frontmatterがなければ { initialCreation: false } を返す。
 * - フラグが真偽値でなければ例外を投げる。
 */
export function parseFrontmatterFlags(content: string): ParsedFrontmatterFlags {
  const frontmatterMatch = FRONTMATTER_PATTERN.exec(content);
  if (!frontmatterMatch) {
    return { initialCreation: false };
  }

  const frontmatterBody = frontmatterMatch[1];

  const traceabilityMatch = TRACEABILITY_BLOCK_PATTERN.exec(frontmatterBody);
  if (!traceabilityMatch) {
    return { initialCreation: false };
  }

  const traceabilityBlock = traceabilityMatch[1];
  const initialCreationMatch = INITIAL_CREATION_PATTERN.exec(traceabilityBlock);
  if (!initialCreationMatch) {
    return { initialCreation: false };
  }

  const rawValue = initialCreationMatch[1];
  if (rawValue !== 'true' && rawValue !== 'false') {
    throw new Error(
      `traceability.initial_creation の値が不正です（true/false のみ許容）: ${rawValue}`,
    );
  }

  return { initialCreation: rawValue === 'true' };
}
