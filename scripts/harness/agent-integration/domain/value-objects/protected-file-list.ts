/**
 * @layer domain
 * @unit agent-integration
 * @work-item-id WI-390
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

/**
 * 設定から除外できない agent trust roots。
 * これらを protectedFiles.exclude で解除できると、防御機構そのものを agent が
 * 無効化してから書き換えられるため、通常の保護対象とは別の集合で保持する。
 */
const NON_EXCLUDABLE_PATTERNS = [
  'phasegate.config.json',
  '.phasegate-local/phasegate.config.json',
  '**/phasegate.config.json',
  // baseline.json は grandfather 判定の信頼基盤。手動追記による protected file の
  // grandfather bypass を防ぐため、書き込み自体を保護対象とする。
  '.phasegate/baseline.json',
  '**/.phasegate/baseline.json',
  // WI-363: .husky/ 配下は L0 runtime の実施点（pre-commit / commit-msg / pre-push）。
  // WI-352 で config カテゴリに分類されるようになり Quick Mode の書き込み許可対象に
  // 入ったため、防御機構そのものの書き換えを protected file として明示的に止める。
  '.husky/**',
  '**/.husky/**',
  // Root agent instructions determine the permissions and operating procedure
  // used by coding agents, so direct agent writes must remain blocked.
  'CLAUDE.md',
  'AGENTS.md',
  'GEMINI.md',
];

/** 利用者設定で除外可能な通常のデフォルト保護対象。 */
const EXCLUDABLE_DEFAULT_PATTERNS = [
  'biome.json',
  '.biome.json',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
];

const DEFAULT_PATTERNS = [...NON_EXCLUDABLE_PATTERNS, ...EXCLUDABLE_DEFAULT_PATTERNS];

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

  static createWithExclusions(exclusions: string[]): ProtectedFileList {
    const excludable = EXCLUDABLE_DEFAULT_PATTERNS.filter((p) => !exclusions.includes(p));
    return new ProtectedFileList([...NON_EXCLUDABLE_PATTERNS, ...excludable]);
  }

  static createWithAdditionalAndExclusions(
    additionalPatterns: string[],
    exclusions: string[],
  ): ProtectedFileList {
    const excludableDefaults = EXCLUDABLE_DEFAULT_PATTERNS.filter((p) => !exclusions.includes(p));
    const excludableAdditional = additionalPatterns.filter((p) => !exclusions.includes(p));
    return new ProtectedFileList([
      ...NON_EXCLUDABLE_PATTERNS,
      ...excludableDefaults,
      ...excludableAdditional,
    ]);
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
