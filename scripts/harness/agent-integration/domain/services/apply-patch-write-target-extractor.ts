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
const APPLY_PATCH_MOVE_LINE_SOURCE = String.raw`^\*\*\*\s+Move\s+to:\s*(.+?)\s*$`;

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
    let match = beginGlobal.exec(rawPatch);
    while (match !== null) {
      beginStarts.push(match.index + match[0].length);
      match = beginGlobal.exec(rawPatch);
    }
    if (beginStarts.length === 0) {
      return EMPTY_TARGETS;
    }

    const endGlobal = new RegExp(APPLY_PATCH_END_SOURCE, "g");
    const endStarts: number[] = [];
    match = endGlobal.exec(rawPatch);
    while (match !== null) {
      endStarts.push(match.index);
      match = endGlobal.exec(rawPatch);
    }

    const targets: PatchWriteTarget[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < beginStarts.length; index += 1) {
      const start = beginStarts[index];
      const nextBegin = index + 1 < beginStarts.length ? beginStarts[index + 1] : rawPatch.length;
      const endInRange = endStarts.find((candidate) => candidate > start && candidate <= nextBegin);
      const body = rawPatch.slice(start, endInRange ?? nextBegin);
      let acceptsMoveDestination = false;

      for (const line of body.split(/\r?\n/)) {
        const fileMatch = new RegExp(APPLY_PATCH_FILE_LINE_SOURCE).exec(line);
        if (fileMatch !== null) {
          const directive = fileMatch[1] as keyof typeof CHANGE_KIND_BY_DIRECTIVE;
          const filePath = fileMatch[2].trim();
          acceptsMoveDestination = directive === "Update";
          if (filePath.length === 0) continue;
          const changeKind = CHANGE_KIND_BY_DIRECTIVE[directive];
          this.appendTarget(targets, seen, filePath, changeKind);
          continue;
        }

        const moveMatch = acceptsMoveDestination ? new RegExp(APPLY_PATCH_MOVE_LINE_SOURCE).exec(line) : null;
        acceptsMoveDestination = false;
        if (moveMatch === null) continue;
        const filePath = moveMatch[1].trim();
        if (filePath.length === 0) continue;
        this.appendTarget(targets, seen, filePath, "CREATE");
      }
    }

    return targets.length === 0 ? EMPTY_TARGETS : Object.freeze(targets);
  }

  private appendTarget(
    targets: PatchWriteTarget[],
    seen: Set<string>,
    filePath: string,
    changeKind: PatchChangeKind,
  ): void {
    const key = `${changeKind}\u0000${filePath}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(Object.freeze({ filePath, changeKind }));
  }
}
