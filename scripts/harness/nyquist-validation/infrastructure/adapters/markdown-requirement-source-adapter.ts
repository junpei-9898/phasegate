// @layer infrastructure
// @unit nyquist-validation
// @work-item-id WI-125

import { readFile } from 'node:fs/promises';
import type { RequirementSourcePort } from '../../application/usecases/generate-requirement-test-matrix-usecase.js';
import type { RequirementSourceDto } from '../../application/dto/generate-matrix-output.js';

// StoryId は HXX-XX 形式に加え Phase 2 拡張 Epic の HF\d+-XX 形式も許容する
// （traceability-model の StoryId 正規表現と整合）。旧 /H\d{2}-\d{2}/ は HF2-01 を取りこぼしていた。
const STORY_HEADING = /^###\s+(H(?:F\d+|\d{2})-\d{2}):/;
const AC_ITEM = /^\s*-\s+\[[ xX]\]\s+(AC-[1-9][0-9]*):/;

export class MarkdownRequirementSourceAdapter implements RequirementSourcePort {
  async readRequirements(sourcePath: string): Promise<readonly RequirementSourceDto[]> {
    const content = await readFile(sourcePath, 'utf-8');
    const results: RequirementSourceDto[] = [];
    let current: { storyId: string; acIds: string[] } | null = null;

    for (const line of content.split(/\r?\n/)) {
      const storyMatch = line.match(STORY_HEADING);
      if (storyMatch) {
        if (current) {
          results.push({ storyId: current.storyId, acIds: Object.freeze([...new Set(current.acIds)]) });
        }
        current = { storyId: storyMatch[1], acIds: [] };
        continue;
      }
      const acMatch = line.match(AC_ITEM);
      if (current && acMatch) {
        current.acIds.push(acMatch[1]);
      }
    }
    if (current) {
      results.push({ storyId: current.storyId, acIds: Object.freeze([...new Set(current.acIds)]) });
    }
    return Object.freeze(results.filter((result) => result.acIds.length > 0));
  }
}
