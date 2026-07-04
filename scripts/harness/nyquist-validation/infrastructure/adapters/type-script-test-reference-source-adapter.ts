// @layer infrastructure
// @unit nyquist-validation
// @work-item-id WI-125

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { TestReferenceSourcePort } from '../../application/usecases/generate-requirement-test-matrix-usecase.js';
import type { TestReferenceSourceDto } from '../../application/dto/generate-matrix-output.js';

// StoryId は HXX-XX 形式に加え Phase 2 拡張 Epic の HF\d+-XX 形式も許容する
// （markdown-requirement-source-adapter の STORY_HEADING / traceability-model の StoryId 正規表現と整合）。
// 旧 /H\d{2}-\d{2}/ は HF2-01 等を取りこぼし、正しく注釈されたテストが「テストなし」と誤判定されていた。
const STORY_TAG = /@story(?:-id)?\s+(H(?:F\d+|\d{2})-\d{2})/;
const TEST_NAME = /\b(?:it|test)(?:\.each\([^)]*\))?\s*\(\s*['"`]([^'"`]+)['"`]/g;

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
      const names = [...content.matchAll(TEST_NAME)].map((match) => match[1]);
      if (names.length === 0) {
        references.push({ storyId, filePath: relativePath, testType });
        continue;
      }
      for (const testName of names) {
        references.push({ storyId, filePath: relativePath, testType, testName });
      }
    }
    return Object.freeze(references);
  }
}
