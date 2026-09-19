// @unit traceability-model
// @layer infrastructure
/**
 * 設計文書先頭 YAML frontmatter から WorkItem メタデータを抽出するパーサー（H03-04 / ISSUE-026 Phase A-2）。
 *
 * - 既存 `parseFrontmatterFlags` (initial_creation) とは独立実装・後方互換
 * - frontmatter 不在時は `null` を返し、必須キー不足・enum 違反時は
 *   `WorkItemFrontmatterValidationError` を throw する
 * - YAML の一般的な edge case（anchor / 複数行 string / tagged type）は非対応。
 *   本 parser は WI frontmatter の単純な key: value + flat/block list のみを扱う
 */

import {
  WORK_ITEM_ID_PATTERN,
  WORK_ITEM_SEVERITIES,
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
  type WorkItemFrontmatter,
  WorkItemFrontmatterValidationError,
  type WorkItemSeverity,
  type WorkItemStatus,
  type WorkItemType,
} from "../../domain/value-objects/work-item-frontmatter.js";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

const scalarPattern = (key: string): RegExp => new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, "m");

const flowArrayPattern = (key: string): RegExp => new RegExp(`^\\s*${key}\\s*:\\s*\\[([^\\]]*)\\]\\s*$`, "m");

const blockArrayPattern = (key: string): RegExp =>
  new RegExp(`^\\s*${key}\\s*:\\s*\\r?\\n((?:[ \\t]+-[ \\t]+.+\\r?\\n?)+)`, "m");

/** Opt-in dependency diagnostics; existing metadata readers keep their old contract. */
export function parseWorkItemDependencies(content: string): readonly string[] | undefined {
  const body = FRONTMATTER_PATTERN.exec(content)?.[1];
  if (body === undefined) return undefined;
  const lines = body.split(/\r?\n/);
  const headers = lines.flatMap((line, index) => /^[ \t]*depends_on[ \t]*:/.test(line) ? [index] : []);
  if (headers.length === 0) return undefined;
  const invalid = (reason: string): never => {
    throw new WorkItemFrontmatterValidationError(`depends_on ${reason}`);
  };
  if (headers.length !== 1) return invalid('が重複しています');
  if (!lines[headers[0]].startsWith('depends_on')) return invalid('はfrontmatter直下に指定してください');
  const withoutComment = (value: string) => value.replace(/[ \t]+#.*$/, '').trim();
  const declaration = withoutComment(lines[headers[0]].replace(/^[ \t]*depends_on[ \t]*:/, ''));
  const continuation: string[] = [];
  for (const line of lines.slice(headers[0] + 1)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (/^[^\s:#][^:]*:/.test(line)) break;
    continuation.push(line);
  }
  let values: string[];
  if (declaration.startsWith('[') && declaration.endsWith(']')) {
    if (continuation.length > 0) return invalid('のflow配列に続く行が不正です');
    const inner = declaration.slice(1, -1).trim();
    values = inner === '' ? [] : inner.split(',');
  } else if (declaration === '') {
    values = [];
    for (const line of continuation) {
      const item = /^[ \t]+-[ \t]+(.+)$/.exec(line);
      if (!item) return invalid('はWI IDの配列で指定してください');
      values.push(withoutComment(item[1]));
    }
    if (values.length === 0) return invalid('の空宣言には [] を指定してください');
  } else {
    return invalid('はWI IDの配列で指定してください');
  }
  const ids = values.map((value) => stripYamlQuotes(value.trim()));
  if (ids.some((id) => !/^WI-\d+$/.test(id))) return invalid('に不正なWI IDまたは空項目があります');
  return Object.freeze(ids);
}

export function parseWorkItemFrontmatter(content: string): WorkItemFrontmatter | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return null;

  const body = match[1];

  const id = extractScalar(body, "id");
  const type = extractScalar(body, "type");

  if (!id && !type) {
    return null;
  }

  if (!id) {
    throw new WorkItemFrontmatterValidationError("id が不足しています");
  }
  if (!type) {
    throw new WorkItemFrontmatterValidationError("type が不足しています");
  }
  if (!WORK_ITEM_ID_PATTERN.test(id)) {
    throw new WorkItemFrontmatterValidationError(`id 形式が不正です: ${id}`);
  }
  if (!WORK_ITEM_TYPES.has(type as WorkItemType)) {
    throw new WorkItemFrontmatterValidationError(`type 値が enum 外: ${type}`);
  }

  const severityRaw = extractScalar(body, "severity");
  if (severityRaw !== undefined && !WORK_ITEM_SEVERITIES.has(severityRaw as WorkItemSeverity)) {
    throw new WorkItemFrontmatterValidationError(`severity 値が enum 外: ${severityRaw}`);
  }

  const statusRaw = extractScalar(body, "status");
  if (statusRaw !== undefined && !WORK_ITEM_STATUSES.has(statusRaw as WorkItemStatus)) {
    throw new WorkItemFrontmatterValidationError(`status 値が enum 外: ${statusRaw}`);
  }

  const affects = extractArray(body, "affects");
  const source = extractScalar(body, "source");
  const legacyId = extractScalar(body, "legacy_id");

  const result: {
    id: string;
    type: WorkItemType;
    affects?: readonly string[];
    severity?: WorkItemSeverity;
    status?: WorkItemStatus;
    source?: string;
    legacyId?: string;
  } = {
    id,
    type: type as WorkItemType,
  };
  if (affects) result.affects = affects;
  if (severityRaw) result.severity = severityRaw as WorkItemSeverity;
  if (statusRaw) result.status = statusRaw as WorkItemStatus;
  if (source) result.source = source;
  if (legacyId) result.legacyId = legacyId;

  return result;
}

function extractScalar(body: string, key: string): string | undefined {
  const match = scalarPattern(key).exec(body);
  if (!match) return undefined;
  const raw = match[1].trim();
  if (raw.length === 0) return undefined;
  // フロー配列記法 (`[a, b]`) は scalar として扱わず、array 抽出側に委ねる
  if (raw.startsWith("[")) return undefined;
  return stripYamlQuotes(raw);
}

function extractArray(body: string, key: string): readonly string[] | undefined {
  const flow = flowArrayPattern(key).exec(body);
  if (flow) {
    const items = flow[1]
      .split(",")
      .map((s) => stripYamlQuotes(s.trim()))
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : undefined;
  }

  const block = blockArrayPattern(key).exec(body);
  if (block) {
    const items = block[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^[ \t]+-[ \t]+/, "").trim())
      .map(stripYamlQuotes)
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : undefined;
  }

  return undefined;
}

function stripYamlQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}
