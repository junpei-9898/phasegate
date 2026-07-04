// @unit agent-integration
// @layer domain

import { posix as path } from "node:path";
import { WriteTargetScopeInvariantError } from "../errors/write-target-scope-invariant-error.js";
import type { PhaseGateLevel } from "../types/phase-gate-level.js";
import type { ProjectPaths } from "./project-paths.js";

type WriteTargetScopeProps = {
  level: PhaseGateLevel;
  unitId?: string;
  storyId?: string;
};

const WORK_ITEM_ID_PATTERN = /^[A-Z][\w]+-\d+$/;

export class WriteTargetScope {
  readonly level: PhaseGateLevel;
  readonly unitId: string | undefined;
  readonly storyId: string | undefined;

  private constructor(props: WriteTargetScopeProps) {
    this.level = props.level;
    this.unitId = props.unitId;
    this.storyId = props.storyId;
  }

  static create(props: WriteTargetScopeProps): WriteTargetScope {
    if (props.level !== 1 && props.level !== 2 && props.level !== 3) {
      throw new WriteTargetScopeInvariantError("level は 1, 2, 3 のいずれかである必要があります（INV-6違反）");
    }

    if (props.level === 1 && (props.unitId !== undefined || props.storyId !== undefined)) {
      throw new WriteTargetScopeInvariantError("level=1 の場合、unitId と storyId は指定できません（INV-7違反）");
    }

    if (props.level === 2 && (props.unitId === undefined || props.storyId !== undefined)) {
      throw new WriteTargetScopeInvariantError("level=2 の場合、unitId は必須で storyId は指定できません（INV-8違反）");
    }

    if (props.level === 3 && props.unitId === undefined) {
      throw new WriteTargetScopeInvariantError("level=3 の場合、unitId は必須です（INV-9違反）");
    }

    return new WriteTargetScope(props);
  }

  static fromPath(filePath: string, projectPaths: ProjectPaths): WriteTargetScope | null {
    const normalizedPath = normalize(filePath);

    if (normalizedPath === "") {
      return null;
    }

    if (normalizedPath.includes("/__tests__/") || normalizedPath.startsWith("__tests__/")) {
      return null;
    }

    for (const sourcePath of projectPaths.getSource()) {
      const sourceMatch = matchPrefix(normalizedPath, sourcePath);
      if (sourceMatch !== null) {
        const [unitId] = sourceMatch;
        if (unitId !== undefined) {
          return WriteTargetScope.create({ level: 3, unitId });
        }
      }
    }

    const inceptionPath = projectPaths.getDocsInception();

    const sharedMatch = matchPrefix(normalizedPath, `${inceptionPath}/_shared`);
    if (sharedMatch !== null || normalizedPath === normalize(`${inceptionPath}/_shared`)) {
      return WriteTargetScope.create({ level: 1 });
    }

    const inceptionMatch = matchPrefix(normalizedPath, inceptionPath);
    if (inceptionMatch !== null) {
      const [unitId, secondSegment, thirdSegment] = inceptionMatch;

      // 横断的 WI: docs/inception/_cross/{WI-XXX}/ → Level 3
      if (unitId === "_cross") {
        if (secondSegment !== undefined && WORK_ITEM_ID_PATTERN.test(secondSegment)) {
          if (thirdSegment === "description.md") {
            return WriteTargetScope.create({ level: 1 });
          }

          return WriteTargetScope.create({ level: 3, unitId, storyId: secondSegment });
        }

        return WriteTargetScope.create({ level: 1 });
      }

      // Unit 所有 WI / 既存 US パス: docs/inception/{unit}/{storyId}/ → Level 3
      if (unitId !== undefined && secondSegment !== undefined && WORK_ITEM_ID_PATTERN.test(secondSegment)) {
        if (secondSegment.startsWith("WI-") && thirdSegment === "description.md") {
          return WriteTargetScope.create({ level: 1 });
        }

        return WriteTargetScope.create({ level: 3, unitId, storyId: secondSegment });
      }
    }

    const constructionMatch = matchPrefix(normalizedPath, projectPaths.getDocsConstruction());
    if (constructionMatch !== null) {
      const [unitId] = constructionMatch;
      if (unitId !== undefined) {
        return WriteTargetScope.create({ level: 2, unitId });
      }
    }

    if (inceptionMatch !== null) {
      const [unitId] = inceptionMatch;
      if (unitId !== undefined) {
        return WriteTargetScope.create({ level: 2, unitId });
      }
    }

    const productRoot = normalize(path.dirname(normalize(projectPaths.getDocsConstruction())));
    const productMatch = matchPrefix(normalizedPath, productRoot);
    if (productMatch !== null && productMatch.length === 1 && productMatch[0]?.includes(".")) {
      return WriteTargetScope.create({ level: 1 });
    }

    return null;
  }

  equals(other: WriteTargetScope): boolean {
    return this.level === other.level && this.unitId === other.unitId && this.storyId === other.storyId;
  }
}

const normalize = (value: string): string => {
  const cleaned = value
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return resolveTraversal(cleaned);
};

// posix セマンティクスで `.`/`..` セグメントを解決する（プロジェクト相対パス想定）。
// これにより `a/b/../c` → `a/c`。フェーズゲート保護回避（P-2）対策として、
// __tests__ 除外や prefix 一致判定はこの解決後のパスに対して適用される。
const resolveTraversal = (value: string): string => {
  if (value === "") {
    return "";
  }

  const segments = value.split("/");
  const resolved: string[] = [];

  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (resolved.length > 0 && resolved[resolved.length - 1] !== "..") {
        resolved.pop();
      } else {
        // プロジェクトルートより上への参照はそのまま残す（保護判定に影響させない）
        resolved.push("..");
      }
      continue;
    }

    resolved.push(segment);
  }

  return resolved.join("/");
};

const matchPrefix = (targetPath: string, basePath: string): string[] | null => {
  const normalizedBase = normalize(basePath);

  // フェーズゲートはセキュリティ境界のため、大小非依存 FS（macOS/Windows）での
  // 保護回避（P-3）を防ぐべく prefix 一致は大文字小文字を無視して判定する。
  const lowerTarget = targetPath.toLowerCase();
  const lowerBase = normalizedBase.toLowerCase();

  if (lowerTarget === lowerBase) {
    return [];
  }

  if (!lowerTarget.startsWith(`${lowerBase}/`)) {
    return null;
  }

  // remainder（unitId 等の抽出結果）は元の大小を保持する。
  const remainder = targetPath.slice(normalizedBase.length + 1);
  return remainder === "" ? [] : remainder.split("/");
};
