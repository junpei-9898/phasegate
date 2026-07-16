// @unit world-model
// @layer infrastructure
// @work-item-id WI-290

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../domain/entities/world-node.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { TextContentNormalizer } from "../../domain/services/text-content-normalizer.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import type { RuntimeFactExtraction } from "./runtime-fact-extraction.js";

const UNIT_TAG = /^\s*(?:\/\/|\*)\s*@unit\s+(.+?)(?:\s*\*\/)?\s*$/;
const LAYER_TAG = /^\s*(?:\/\/|\*)\s*@layer\s+(.+?)(?:\s*\*\/)?\s*$/;
const WORK_ITEM_TAG = /^\s*(?:\/\/|\*)\s*@work-item-id\s+(.+?)(?:\s*\*\/)?\s*$/;

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export type TypeScriptSourceKind = "implementation" | "test";

export interface TypeScriptSourceFactExtractorDeps {
  readonly rootDir: string;
  readonly hashingPort: WorldHashingPort;
  readonly sourceKind: TypeScriptSourceKind;
  readonly include: (relativePath: string) => boolean;
}

const splitValues = (value: string): readonly string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export class TypeScriptSourceFactExtractor {
  private readonly deps: TypeScriptSourceFactExtractorDeps;
  private readonly normalizer = new TextContentNormalizer();

  constructor(deps: TypeScriptSourceFactExtractorDeps) {
    this.deps = deps;
  }

  async extract(): Promise<RuntimeFactExtraction> {
    const nodes: WorldNode[] = [];
    const diagnostics: ExtractionDiagnostic[] = [];
    const visit = async (directory: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        const relativePath = path.relative(this.deps.rootDir, directory).split(path.sep).join("/");
        diagnostics.push(
          ExtractionDiagnostic.create({
            code: "source-read-failure",
            path: PathKey.create(relativePath),
            payload: { message: error instanceof Error ? error.message : String(error) },
          }),
        );
        return;
      }
      entries.sort((left, right) => compareStrings(left.name, right.name));
      for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);
        const relativePath = path.relative(this.deps.rootDir, absolutePath).split(path.sep).join("/");
        if (entry.isSymbolicLink()) {
          diagnostics.push(
            ExtractionDiagnostic.create({
              code: "unsupported-file-type",
              path: PathKey.create(relativePath),
              payload: { fileType: "symlink", sourceKind: this.deps.sourceKind },
            }),
          );
          continue;
        }
        if (entry.isDirectory()) {
          await visit(absolutePath);
          continue;
        }
        if (!relativePath.endsWith(".ts") || !this.deps.include(relativePath)) continue;
        const pathKey = PathKey.create(relativePath);
        if (!entry.isFile()) {
          diagnostics.push(
            ExtractionDiagnostic.create({
              code: "unsupported-file-type",
              path: pathKey,
              payload: { fileType: "non-regular", sourceKind: this.deps.sourceKind },
            }),
          );
          continue;
        }
        let bytes: Uint8Array;
        try {
          bytes = await readFile(absolutePath);
        } catch (error) {
          diagnostics.push(
            ExtractionDiagnostic.create({
              code: "source-read-failure",
              path: pathKey,
              payload: { message: error instanceof Error ? error.message : String(error) },
            }),
          );
          continue;
        }
        const normalized = this.normalizer.normalize(bytes);
        if (!normalized.ok) {
          diagnostics.push(
            ExtractionDiagnostic.create({
              code: normalized.diagnostic.code,
              path: pathKey,
              payload: normalized.diagnostic.payload,
            }),
          );
          continue;
        }
        const metadata = this.parseMetadata(normalized.text, pathKey, diagnostics);
        nodes.push(
          WorldNode.sourceFile({
            path: pathKey,
            digest: this.deps.hashingPort.sha256(normalized.bytes),
            attributes: {
              layer: metadata.layer,
              sourceKind: this.deps.sourceKind,
              unit: metadata.unit,
              workItemIds: metadata.workItemIds,
            },
          }),
        );
      }
    };
    await visit(path.join(this.deps.rootDir, "scripts/harness"));
    const collisionPaths = new Set<string>();
    const pathsByFolded = new Map<string, string[]>();
    for (const node of nodes) {
      const sourcePath = node.projection.type === "source-file" ? node.projection.pathKey : "";
      const current = pathsByFolded.get(sourcePath.toLowerCase()) ?? [];
      current.push(sourcePath);
      pathsByFolded.set(sourcePath.toLowerCase(), current);
    }
    for (const paths of pathsByFolded.values()) {
      const uniquePaths = [...new Set(paths)];
      if (uniquePaths.length < 2) continue;
      const candidatePaths = uniquePaths.sort(compareStrings);
      for (const candidatePath of candidatePaths) collisionPaths.add(candidatePath);
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "case-fold-path-collision",
          path: PathKey.create(candidatePaths[0]),
          payload: { candidatePaths },
        }),
      );
    }
    return {
      nodes: nodes
        .filter((node) => node.projection.type !== "source-file" || !collisionPaths.has(node.projection.pathKey))
        .sort((left, right) => compareStrings(left.id.toString(), right.id.toString())),
      edges: [],
      diagnostics: diagnostics.sort((left, right) => {
        const code = compareStrings(left.code, right.code);
        if (code !== 0) return code;
        return compareStrings(left.path?.toString() ?? "", right.path?.toString() ?? "");
      }),
    };
  }

  private parseMetadata(
    content: string,
    pathKey: PathKey,
    diagnostics: ExtractionDiagnostic[],
  ): { readonly unit: string | null; readonly layer: string | null; readonly workItemIds: readonly string[] } {
    const units = new Set<string>();
    const layers = new Set<string>();
    const workItemIds = new Set<string>();
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("*") &&
        trimmed !== "*/"
      ) {
        break;
      }
      const unit = UNIT_TAG.exec(line);
      if (unit) for (const value of splitValues(unit[1])) units.add(value);
      const layer = LAYER_TAG.exec(line);
      if (layer) for (const value of splitValues(layer[1])) layers.add(value);
      const workItems = WORK_ITEM_TAG.exec(line);
      if (workItems) {
        const matches = workItems[1].match(/\bWI-\d+\b/g) ?? [];
        if (matches.length === 0) {
          diagnostics.push(
            ExtractionDiagnostic.create({
              code: "malformed-source-work-item",
              path: pathKey,
              line: index + 1,
              payload: { raw: workItems[1] },
            }),
          );
        }
        for (const workItemId of matches) workItemIds.add(workItemId);
      }
    }
    if (units.size === 0) {
      diagnostics.push(ExtractionDiagnostic.create({ code: "missing-source-unit", path: pathKey }));
    } else if (units.size > 1) {
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "ambiguous-source-unit",
          path: pathKey,
          payload: { candidates: [...units].sort(compareStrings) },
        }),
      );
    }
    if (layers.size === 0) {
      diagnostics.push(ExtractionDiagnostic.create({ code: "missing-source-layer", path: pathKey }));
    } else if (layers.size > 1) {
      diagnostics.push(
        ExtractionDiagnostic.create({
          code: "ambiguous-source-layer",
          path: pathKey,
          payload: { candidates: [...layers].sort(compareStrings) },
        }),
      );
    }
    return {
      unit: units.size === 1 ? [...units][0] : null,
      layer: layers.size === 1 ? [...layers][0] : null,
      workItemIds: [...workItemIds].sort(compareStrings),
    };
  }
}
