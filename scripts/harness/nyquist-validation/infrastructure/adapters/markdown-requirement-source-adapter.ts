// @layer infrastructure
// @unit nyquist-validation
// @work-item-id WI-125

import { readFile } from 'node:fs/promises';
import type { RequirementSourcePort } from '../../application/usecases/generate-requirement-test-matrix-usecase.js';
import type { RequirementSourceDto } from '../../application/dto/generate-matrix-output.js';

const STORY_HEADING = /^###\s+(H\d{2}-\d{2}):/;
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
