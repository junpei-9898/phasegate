/**
 * @layer domain
 * @unit agent-integration
 * @work-item-id WI-384
 *
 * Codex apply_patch の raw patch から書き込み対象と変更種別を抽出する。
 */

export type PatchChangeKind = "CREATE" | "MODIFY" | "DELETE";

export interface PatchWriteTarget {
  readonly filePath: string;
  readonly changeKind: PatchChangeKind;
}

const APPLY_PATCH_BEGIN_SOURCE = String.raw`\*\*\*\s+Begin\s+Patch`;
const APPLY_PATCH_END_SOURCE = String.raw`\*\*\*\s+End\s+Patch`;
const APPLY_PATCH_FILE_LINE_SOURCE = String.raw`^\*\*\*\s+(Update|Add|Delete)\s+File:\s*(.+?)\s*$`;

const CHANGE_KIND_BY_DIRECTIVE = Object.freeze({
  Add: "CREATE",
  Update: "MODIFY",
  Delete: "DELETE",
} as const satisfies Readonly<Record<string, PatchChangeKind>>);

const EMPTY_TARGETS: readonly PatchWriteTarget[] = Object.freeze([]);

export class ApplyPatchWriteTargetExtractor {
  extract(rawPatch: string): readonly PatchWriteTarget[] {
    if (typeof rawPatch !== "string" || rawPatch.length === 0) {
      return EMPTY_TARGETS;
    }

    const beginGlobal = new RegExp(APPLY_PATCH_BEGIN_SOURCE, "g");
    const beginStarts: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = beginGlobal.exec(rawPatch)) !== null) {
      beginStarts.push(match.index + match[0].length);
    }
    if (beginStarts.length === 0) {
      return EMPTY_TARGETS;
    }

    const endGlobal = new RegExp(APPLY_PATCH_END_SOURCE, "g");
    const endStarts: number[] = [];
    while ((match = endGlobal.exec(rawPatch)) !== null) {
      endStarts.push(match.index);
    }

    const targets: PatchWriteTarget[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < beginStarts.length; index += 1) {
      const start = beginStarts[index];
      const nextBegin = index + 1 < beginStarts.length ? beginStarts[index + 1] : rawPatch.length;
      const endInRange = endStarts.find((candidate) => candidate > start && candidate <= nextBegin);
      const body = rawPatch.slice(start, endInRange ?? nextBegin);
      const fileRegex = new RegExp(APPLY_PATCH_FILE_LINE_SOURCE, "gm");

      while ((match = fileRegex.exec(body)) !== null) {
        const directive = match[1] as keyof typeof CHANGE_KIND_BY_DIRECTIVE;
        const filePath = match[2].trim();
        if (filePath.length === 0) continue;
        const changeKind = CHANGE_KIND_BY_DIRECTIVE[directive];
        const key = `${changeKind}\u0000${filePath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        targets.push(Object.freeze({ filePath, changeKind }));
      }
    }

    return targets.length === 0 ? EMPTY_TARGETS : Object.freeze(targets);
  }
}
