/**
 * @layer domain
 * @unit agent-integration
 *
 * ProtectedFileList 値オブジェクト
 * 変更をブロックすべきファイルのパターンリスト
 */

export class ProtectedFileListEmptyError extends Error {
  constructor() {
    super('patternsは1件以上必要です（INV-4違反）');
    this.name = 'ProtectedFileListEmptyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** デフォルトの保護対象ファイルパターン */
const DEFAULT_PATTERNS = [
  'biome.json',
  '.biome.json',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
];

/**
 * glob パターンのシンプルなマッチング実装
 * micromatch なしで基本的な glob をサポート
 */
function matchesGlob(filePath: string, pattern: string): boolean {
  if (filePath === '') return false;

  // Exact match
  if (pattern === filePath) return true;

  // Convert glob to regex
  // Escape special regex chars except * and ?
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*')
    .replace(/\?/g, '[^/]');

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(filePath);
}

export class ProtectedFileList {
  readonly patterns: readonly string[];

  private constructor(patterns: string[]) {
    this.patterns = Object.freeze([...patterns]);
  }

  static create(input: { patterns: string[] }): ProtectedFileList {
    if (input.patterns.length === 0) {
      throw new ProtectedFileListEmptyError();
    }
    return new ProtectedFileList(input.patterns);
  }

  static createDefault(): ProtectedFileList {
    return new ProtectedFileList([...DEFAULT_PATTERNS]);
  }

  static createWithAdditional(additionalPatterns: string[]): ProtectedFileList {
    const allPatterns = [...DEFAULT_PATTERNS, ...additionalPatterns];
    return new ProtectedFileList(allPatterns);
  }

  matches(filePath: string): boolean {
    if (filePath === '') return false;
    return this.patterns.some((pattern) => {
      // Direct match (exact)
      if (pattern === filePath) return true;
      // Glob match (only when pattern contains wildcards)
      if (pattern.includes('*') || pattern.includes('?')) {
        return matchesGlob(filePath, pattern);
      }
      return false;
    });
  }

  equals(other: ProtectedFileList): boolean {
    if (this.patterns.length !== other.patterns.length) return false;
    return this.patterns.every((p, i) => p === other.patterns[i]);
  }
}
