// @layer infrastructure
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-292

import { readFile } from 'node:fs/promises';
import type { RequirementSourcePort } from '../../application/usecases/generate-requirement-test-matrix-usecase.js';
import type {
  RequirementSourceDto,
  StoryCoverageStatus,
} from '../../application/dto/generate-matrix-output.js';

// StoryId は HXX-XX 形式に加え Phase 2 拡張 Epic の HF\d+-XX 形式も許容する
// （traceability-model の StoryId 正規表現と整合）。旧 /H\d{2}-\d{2}/ は HF2-01 を取りこぼしていた。
const STORY_HEADING = /^###\s+(H(?:F\d+|\d{2})-\d{2}):/;
const SECTION_HEADING = /^#{1,3}\s+/;
const AC_ITEM = /^\s*-\s+\[[ xX]\]\s+(AC-[1-9][0-9]*):/;
const COVERAGE_STATUS = /^\*\*Coverage status\*\*:\s*(\S+)\s*$/;
const COVERAGE_LIFECYCLE = /^\*\*Coverage lifecycle\*\*:\s*(.+?)\s*$/;

interface PendingStory {
  readonly storyId: string;
  readonly acIds: string[];
  coverageStatus?: string;
  coverageLifecycle?: readonly string[];
}

const isCoverageStatus = (value: string): value is StoryCoverageStatus =>
  value === 'planned' || value === 'required';

const isValidLifecycle = (values: readonly StoryCoverageStatus[]): boolean =>
  (values.length === 1 && (values[0] === 'planned' || values[0] === 'required'))
  || (values.length === 2 && values[0] === 'planned' && values[1] === 'required');

function completeStory(story: PendingStory): RequirementSourceDto {
  const rawStatus = story.coverageStatus ?? 'required';
  if (!isCoverageStatus(rawStatus)) {
    throw new Error(`Invalid coverage lifecycle for ${story.storyId}: unknown status ${rawStatus}`);
  }
  const rawLifecycle = story.coverageLifecycle ?? [rawStatus];
  if (!rawLifecycle.every(isCoverageStatus)) {
    throw new Error(`Invalid coverage lifecycle for ${story.storyId}: unknown lifecycle value`);
  }
  const lifecycle: readonly StoryCoverageStatus[] = Object.freeze([...rawLifecycle]);
  if (!isValidLifecycle(lifecycle) || lifecycle[lifecycle.length - 1] !== rawStatus) {
    throw new Error(
      `Invalid coverage lifecycle for ${story.storyId}: ${lifecycle.join(' -> ')} does not end at ${rawStatus}`,
    );
  }
  return {
    storyId: story.storyId,
    acIds: Object.freeze([...new Set(story.acIds)]),
    coverageStatus: rawStatus,
    coverageLifecycle: lifecycle,
  };
}

export class MarkdownRequirementSourceAdapter implements RequirementSourcePort {
  async readRequirements(sourcePath: string): Promise<readonly RequirementSourceDto[]> {
    const content = await readFile(sourcePath, 'utf-8');
    const results: RequirementSourceDto[] = [];
    let current: PendingStory | null = null;

    for (const line of content.split(/\r?\n/)) {
      const storyMatch = line.match(STORY_HEADING);
      if (storyMatch) {
        if (current) {
          results.push(completeStory(current));
        }
        current = { storyId: storyMatch[1], acIds: [] };
        continue;
      }
      if (current && SECTION_HEADING.test(line)) {
        results.push(completeStory(current));
        current = null;
        continue;
      }
      const statusMatch = line.match(COVERAGE_STATUS);
      if (current && statusMatch) {
        if (current.coverageStatus !== undefined) {
          throw new Error(`Invalid coverage lifecycle for ${current.storyId}: duplicate status`);
        }
        current.coverageStatus = statusMatch[1];
        continue;
      }
      const lifecycleMatch = line.match(COVERAGE_LIFECYCLE);
      if (current && lifecycleMatch) {
        if (current.coverageLifecycle !== undefined) {
          throw new Error(`Invalid coverage lifecycle for ${current.storyId}: duplicate lifecycle`);
        }
        current.coverageLifecycle = Object.freeze(
          lifecycleMatch[1].split(/\s*->\s*/).map((value) => value.trim()),
        );
        continue;
      }
      const acMatch = line.match(AC_ITEM);
      if (current && acMatch) {
        current.acIds.push(acMatch[1]);
      }
    }
    if (current) {
      results.push(completeStory(current));
    }
    return Object.freeze(results.filter((result) => result.acIds.length > 0));
  }
}
