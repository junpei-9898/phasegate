// @unit traceability-model
// @layer infrastructure
// @work-item-id WI-305

import { execFileSync } from "node:child_process";
import type {
  ChangedDesignFragmentDto,
  DesignChangeReadDiagnosticDto,
  DesignChangeReadResultDto,
  DesignFragmentCorpusRole,
} from "../../application/dto/changed-design-fragment-dto.js";
import type { StagedDesignChangeSourcePort } from "../../application/ports/staged-design-change-source-port.js";

const FRAGMENT = /^\s*<!--\s*@world-fragment-id\s+(\S+)\s*-->\s*$/;
const WORK_ITEM = /^\s*<!--\s*@work-item-id\s+(.+?)\s*-->\s*$/;
const REFLECTS = /^\s*<!--\s*@world-reflects\s+(\S+)\s*-->\s*$/;
const HEADING = /^#{1,6}\s+/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

interface ParsedFragment {
  readonly declaredKey: string;
  readonly content: string;
  readonly workItemIds: readonly string[];
  readonly reflectionTargets: readonly string[];
}

interface ParsedFragmentSet {
  readonly fragments: readonly ParsedFragment[];
  readonly validPrelude: boolean;
}

const corpusRoleOf = (filePath: string): DesignFragmentCorpusRole | null => {
  if (filePath.startsWith("docs/product/")) return "product";
  if (filePath.startsWith("docs/inception/")) return "inception";
  return null;
};

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)].sort(compare));

const parseFragments = (text: string): ParsedFragmentSet => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const markers: { readonly index: number; readonly key: string }[] = [];
  let activeFence: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const fence = FENCE.exec(lines[index]);
    if (fence) {
      const character = fence[1][0];
      activeFence = activeFence === null ? character : activeFence === character ? null : activeFence;
      continue;
    }
    if (activeFence !== null) continue;
    const marker = FRAGMENT.exec(lines[index]);
    if (marker) markers.push({ index, key: marker[1] });
  }

  let validPrelude = true;
  const fragments = markers.flatMap((marker, markerIndex): readonly ParsedFragment[] => {
    const end = markers[markerIndex + 1]?.index ?? lines.length;
    let headingIndex = marker.index + 1;
    while (headingIndex < end && (WORK_ITEM.test(lines[headingIndex]) || REFLECTS.test(lines[headingIndex]))) {
      headingIndex += 1;
    }
    if (headingIndex >= end || !HEADING.test(lines[headingIndex])) {
      validPrelude = false;
      return [];
    }
    const metadata = lines.slice(marker.index, headingIndex);
    return [
      Object.freeze({
        declaredKey: marker.key,
        content: lines.slice(marker.index, end).join("\n"),
        workItemIds: uniqueSorted(metadata.flatMap((line) => WORK_ITEM.exec(line)?.[1].match(/\bWI-\d+\b/g) ?? [])),
        reflectionTargets: uniqueSorted(metadata.flatMap((line) => REFLECTS.exec(line)?.[1] ?? [])),
      }),
    ];
  });
  return Object.freeze({ fragments: Object.freeze(fragments), validPrelude });
};

const indexByKey = (fragments: readonly ParsedFragment[]): Map<string, ParsedFragment> | null => {
  const result = new Map<string, ParsedFragment>();
  for (const fragment of fragments) {
    if (result.has(fragment.declaredKey)) return null;
    result.set(fragment.declaredKey, fragment);
  }
  return result;
};

export class GitStagedDesignChangeAdapter implements StagedDesignChangeSourcePort {
  constructor(private readonly rootDir: string) {}

  async observe(stagedFiles: readonly string[]): Promise<DesignChangeReadResultDto> {
    const fragments: ChangedDesignFragmentDto[] = [];
    const diagnostics: DesignChangeReadDiagnosticDto[] = [];
    for (const filePath of [...new Set(stagedFiles)].sort(compare)) {
      const corpusRole = corpusRoleOf(filePath);
      if (corpusRole === null || !filePath.endsWith(".md")) continue;
      const beforeText = this.readBlob(`HEAD:${filePath}`);
      const afterText = this.readBlob(`:${filePath}`);
      if (beforeText === null && afterText === null) {
        diagnostics.push(Object.freeze({ code: "staged-design-content-unavailable", path: filePath }));
        continue;
      }
      const beforeParsed = parseFragments(beforeText ?? "");
      const afterParsed = parseFragments(afterText ?? "");
      if (!beforeParsed.validPrelude || !afterParsed.validPrelude) {
        diagnostics.push(Object.freeze({ code: "invalid-staged-fragment-prelude", path: filePath }));
        continue;
      }
      const before = indexByKey(beforeParsed.fragments);
      const after = indexByKey(afterParsed.fragments);
      if (before === null || after === null) {
        diagnostics.push(Object.freeze({ code: "duplicate-staged-fragment-key", path: filePath }));
        continue;
      }
      const keys = uniqueSorted([...before.keys(), ...after.keys()]);
      for (const key of keys) {
        const oldFragment = before.get(key);
        const newFragment = after.get(key);
        if (oldFragment?.content === newFragment?.content) continue;
        const observed = newFragment ?? oldFragment;
        if (!observed) continue;
        fragments.push(
          Object.freeze({
            corpusRole,
            declaredKey: key,
            path: filePath,
            changeKind: oldFragment === undefined ? "added" : newFragment === undefined ? "deleted" : "modified",
            workItemIds: observed.workItemIds,
            reflectionTargets: observed.reflectionTargets,
          }),
        );
      }
    }
    if (diagnostics.length > 0) {
      return Object.freeze({ state: "unavailable", diagnostics: Object.freeze(diagnostics) });
    }
    return Object.freeze({ state: "available", fragments: Object.freeze(fragments), diagnostics: Object.freeze([]) });
  }

  private readBlob(spec: string): string | null {
    try {
      return execFileSync("git", ["show", spec], {
        cwd: this.rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 8 * 1024 * 1024,
      });
    } catch {
      return null;
    }
  }
}
