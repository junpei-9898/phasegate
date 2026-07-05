// @layer infrastructure
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-222

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { TestReferenceSourcePort } from '../../application/usecases/generate-requirement-test-matrix-usecase.js';
import type { OrphanAcTagDto, TestReferenceSourceDto } from '../../application/dto/generate-matrix-output.js';

// StoryId は HXX-XX 形式に加え Phase 2 拡張 Epic の HF\d+-XX 形式も許容する
// （markdown-requirement-source-adapter の STORY_HEADING / traceability-model の StoryId 正規表現と整合）。
// 旧 /H\d{2}-\d{2}/ は HF2-01 等を取りこぼし、正しく注釈されたテストが「テストなし」と誤判定されていた。
const STORY_TAG = /@story(?:-id)?\s+(H(?:F\d+|\d{2})-\d{2})/;
const STORY_TAG_GLOBAL = /@story(?:-id)?\s+(H(?:F\d+|\d{2})-\d{2})/g;
// HF2-05: @ac は 1 行に複数 AC を許容する。行末までの全トークンを個別に解釈する。
// 各トークンは絶対形式 `HXX-YY-N`（story-relative でない）または相対形式 `AC-N`。
const AC_TAG_LINE = /@ac\s+(.+?)\s*$/;
const AC_ABSOLUTE_TOKEN = /^(H(?:F\d+|\d{2})-\d{2})-([1-9][0-9]*)$/;
const AC_RELATIVE_TOKEN = /^AC-([1-9][0-9]*)$/;
// テストケース開始行の検出（it / test、.each やスペースを許容）。
const TEST_START = /\b(?:it|test)(?:\.each\([^)]*\))?\s*\(\s*['"`]([^'"`]+)['"`]/;

interface PendingAcToken {
  readonly rawTag: string;
  readonly resolvedAcId: string | null;
  readonly reason: OrphanAcTagDto['reason'] | null;
}

async function collectTestFiles(root: string): Promise<readonly string[]> {
  const rootStat = await stat(root).catch(() => null);
  if (rootStat === null) return [];
  if (rootStat.isFile()) return /\.(test|spec)\.[cm]?[tj]sx?$/.test(root) ? [root] : [];

  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git')
    .map((entry) => collectTestFiles(path.join(root, entry.name))));
  return Object.freeze(nested.flat());
}

function classifyTestType(filePath: string): 'unit' | 'it' | 'scenario' {
  const normalized = filePath.toLowerCase();
  if (normalized.includes('/scenario/') || normalized.includes('.scenario.')) return 'scenario';
  if (normalized.includes('/integration/') || normalized.includes('.it.') || normalized.includes('.integration.')) return 'it';
  return 'unit';
}

export class TypeScriptTestReferenceSourceAdapter implements TestReferenceSourcePort {
  async readTestReferences(testRoot: string): Promise<readonly TestReferenceSourceDto[]> {
    const files = await collectTestFiles(testRoot);
    const references: TestReferenceSourceDto[] = [];
    for (const filePath of files) {
      const content = await readFile(filePath, 'utf-8');
      const storyMatch = content.match(STORY_TAG);
      if (!storyMatch) continue;
      const storyId = storyMatch[1];
      const relativePath = path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
      const testType = classifyTestType(relativePath);
      // HF2-05: 相対 @ac (AC-N) はファイルに @story がちょうど 1 件のときのみ解決する。
      const storyCount = [...content.matchAll(STORY_TAG_GLOBAL)].length;
      references.push(...this.scanFile({ content, storyId, relativePath, testType, storyCount }));
    }
    return Object.freeze(references);
  }

  /**
   * HF2-05: ファイル内容を行単位で走査し、直前の it()/test() 以降に現れた @ac を
   * 「最近接の @ac」として次のテストケースへ紐づける（positional scan）。
   * @ac が無いテストは従来どおり acIds 無しの参照を生成する。
   */
  private scanFile(args: {
    content: string;
    storyId: string;
    relativePath: string;
    testType: 'unit' | 'it' | 'scenario';
    storyCount: number;
  }): TestReferenceSourceDto[] {
    const { content, storyId, relativePath, testType, storyCount } = args;
    const lines = content.split('\n');
    const result: TestReferenceSourceDto[] = [];
    let pending: PendingAcToken[] = [];

    for (const line of lines) {
      const acMatch = line.match(AC_TAG_LINE);
      if (acMatch) {
        for (const token of acMatch[1].trim().split(/\s+/)) {
          if (token.length > 0) pending.push(this.resolveAcToken(token, storyId, storyCount));
        }
        continue;
      }
      const testMatch = line.match(TEST_START);
      if (testMatch) {
        result.push(this.buildReference({
          storyId,
          relativePath,
          testType,
          testName: testMatch[1],
          pending,
        }));
        pending = [];
      }
    }

    // it()/test() が 1 件も無い注釈済みファイルは、file-level 参照 1 件を維持する（従来挙動）。
    if (result.length === 0) {
      result.push({ storyId, filePath: relativePath, testType });
    }
    return result;
  }

  private buildReference(args: {
    storyId: string;
    relativePath: string;
    testType: 'unit' | 'it' | 'scenario';
    testName: string;
    pending: readonly PendingAcToken[];
  }): TestReferenceSourceDto {
    const { storyId, relativePath, testType, testName, pending } = args;
    const base: TestReferenceSourceDto = { storyId, filePath: relativePath, testType, testName };
    if (pending.length === 0) return base;

    const acIds = pending.filter((p) => p.resolvedAcId !== null).map((p) => p.resolvedAcId as string);
    const orphanAcTags: OrphanAcTagDto[] = pending
      .filter((p) => p.resolvedAcId === null && p.reason !== null)
      .map((p) => ({ storyId, filePath: relativePath, testName, rawTag: p.rawTag, reason: p.reason as OrphanAcTagDto['reason'] }));

    return {
      ...base,
      ...(acIds.length > 0 ? { acIds: Object.freeze([...new Set(acIds)]) } : {}),
      ...(orphanAcTags.length > 0 ? { orphanAcTags: Object.freeze(orphanAcTags) } : {}),
    };
  }

  /**
   * 1 個の @ac トークンを解釈する。
   * - 絶対形式 `HXX-YY-N`: story が一致すれば `AC-N` に解決、不一致なら ac-not-in-story orphan。
   * - 相対形式 `AC-N`: @story が単一なら `AC-N` に解決、複数なら relative-multi-story orphan。
   */
  private resolveAcToken(token: string, storyId: string, storyCount: number): PendingAcToken {
    const absolute = token.match(AC_ABSOLUTE_TOKEN);
    if (absolute) {
      const [, tokenStory, acNumber] = absolute;
      if (tokenStory === storyId) {
        return { rawTag: token, resolvedAcId: `AC-${acNumber}`, reason: null };
      }
      return { rawTag: token, resolvedAcId: null, reason: 'ac-not-in-story' };
    }
    const relative = token.match(AC_RELATIVE_TOKEN);
    if (relative) {
      if (storyCount === 1) {
        return { rawTag: token, resolvedAcId: `AC-${relative[1]}`, reason: null };
      }
      return { rawTag: token, resolvedAcId: null, reason: 'relative-multi-story' };
    }
    // 形式不明トークンは advisory orphan として ac-not-in-story 扱い。
    return { rawTag: token, resolvedAcId: null, reason: 'ac-not-in-story' };
  }
}
