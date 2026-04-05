/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * TypeScript/TSX/JS/JSXの行コメントまたはJSDocから @unit / @layer / @story を抽出する行指向パーサー
 */
import type { MetadataTagLike } from '../../domain/ports/metadata-reader-port.js';

const UNIT_TAG_PATTERN = /^\s*(?:\/\/|\*)\s*@unit\s+(.+)$/;
const LAYER_TAG_PATTERN = /^\s*(?:\/\/|\*)\s*@layer\s+(.+)$/;
const STORY_TAG_PATTERN = /^\s*(?:\/\/|\*)\s*@story\s+(.+)$/;
const STORY_ID_TAG_PATTERN = /^\s*(?:\/\/|\*)\s*@story-id\s+(.+)$/;

export interface ParsedMetadataTag {
  readonly type: string;
  readonly value: string;
  readonly lineNumber: number;
}

function expandUnitTags(rawValue: string, lineNumber: number): ParsedMetadataTag[] {
  if (!rawValue.includes(',')) {
    return [{ type: '@unit', value: rawValue.trim(), lineNumber }];
  }
  return rawValue
    .split(',')
    .map((v) => ({
      type: '@unit' as const,
      value: v.trim(),
      lineNumber,
    }))
    .filter((t) => t.value.length > 0);
}

/**
 * 実装ファイル向けに @unit / @layer / @story-id を抽出する
 */
export function parseImplementationTags(content: string): readonly ParsedMetadataTag[] {
  const lines = content.split('\n');
  const tags: ParsedMetadataTag[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const unitMatch = UNIT_TAG_PATTERN.exec(line);
    if (unitMatch) {
      tags.push(...expandUnitTags(unitMatch[1], lineNumber));
    }

    const layerMatch = LAYER_TAG_PATTERN.exec(line);
    if (layerMatch) {
      tags.push({ type: '@layer', value: layerMatch[1].trim(), lineNumber });
    }

    const storyIdMatch = STORY_ID_TAG_PATTERN.exec(line);
    if (storyIdMatch) {
      tags.push({ type: '@story-id', value: storyIdMatch[1].trim(), lineNumber });
    }
  }

  return Object.freeze([...tags]);
}

/**
 * テストファイル向けに @story を抽出する
 */
export function parseTestTags(content: string): readonly ParsedMetadataTag[] {
  const lines = content.split('\n');
  const tags: ParsedMetadataTag[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const storyMatch = STORY_TAG_PATTERN.exec(line);
    if (storyMatch) {
      tags.push({ type: '@story', value: storyMatch[1].trim(), lineNumber });
    }
  }

  return Object.freeze([...tags]);
}

/**
 * 全タグ種別を抽出する（汎用）
 */
export function parseAllTags(content: string): readonly ParsedMetadataTag[] {
  const lines = content.split('\n');
  const tags: ParsedMetadataTag[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    const unitMatch = UNIT_TAG_PATTERN.exec(line);
    if (unitMatch) {
      tags.push(...expandUnitTags(unitMatch[1], lineNumber));
    }

    const layerMatch = LAYER_TAG_PATTERN.exec(line);
    if (layerMatch) {
      tags.push({ type: '@layer', value: layerMatch[1].trim(), lineNumber });
    }

    const storyIdMatch = STORY_ID_TAG_PATTERN.exec(line);
    if (storyIdMatch) {
      tags.push({ type: '@story-id', value: storyIdMatch[1].trim(), lineNumber });
    }

    const storyMatch = STORY_TAG_PATTERN.exec(line);
    if (storyMatch) {
      tags.push({ type: '@story', value: storyMatch[1].trim(), lineNumber });
    }
  }

  return Object.freeze([...tags]);
}
