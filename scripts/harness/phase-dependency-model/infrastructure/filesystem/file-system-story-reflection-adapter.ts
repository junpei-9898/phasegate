/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import type { Dirent } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { StoryReflectionFileSystemPort } from "../../domain/ports/story-reflection-file-system-port.js";

const CROSS_WORK_ITEM_PATTERN = /^WI-\d+$/;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;
const AFFECTS_INLINE_PATTERN = /^affects:\s*\[([^\]]*)\]\s*$/m;
const LEGACY_ID_PATTERN = /^legacy_id:\s*([A-Z][\w]+-\d+)\s*$/m;

export interface FileSystemStoryReflectionAdapterDeps {
  readonly rootDir: string;
  /** inception ディレクトリのルート（デフォルト: docs/inception） */
  readonly inceptionRoot?: string;
}

/**
 * ファイルシステム上の docs/inception ディレクトリ列挙と
 * product 文書内 `@story-id` / `@issue-id` / `@work-item-id` アノテーション
 * 検索を実装するアダプタ。
 *
 * 存在しないパス・読めないファイルは true/false に正規化し例外を投げない
 * ことで、上位 (StoryReflectionChecker) の純粋性を保つ。
 *
 * ISSUE-026 / H02-04: `@issue-id` / `@work-item-id` も `@story-id` と同等に
 * 認識する（WI 一本化への段階移行のため、既存 `@story-id` と併存）。
 */
export class FileSystemStoryReflectionAdapter implements StoryReflectionFileSystemPort {
  private readonly rootDir: string;
  private readonly inceptionRoot: string;

  constructor(deps: FileSystemStoryReflectionAdapterDeps) {
    this.rootDir = deps.rootDir;
    this.inceptionRoot = deps.inceptionRoot ?? "docs/inception";
  }

  async listStoryDirectories(unitId: string): Promise<readonly string[]> {
    const ids = new Set<string>();

    for (const id of await this.listUnitWorkItemDirectories(unitId)) {
      ids.add(id);
    }
    for (const id of await this.listCrossWorkItemDirectories()) {
      ids.add(id);
    }

    return [...ids].sort();
  }

  private async listUnitWorkItemDirectories(unitId: string): Promise<readonly string[]> {
    const unitDir = path.join(this.rootDir, this.inceptionRoot, unitId);
    const entries = await this.readDirectories(unitDir);

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== "issues" && !name.startsWith("_") && !name.startsWith("."))
      .sort();
  }

  private async listCrossWorkItemDirectories(): Promise<readonly string[]> {
    const crossDir = path.join(this.rootDir, this.inceptionRoot, "_cross");
    const entries = await this.readDirectories(crossDir);

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => CROSS_WORK_ITEM_PATTERN.test(name))
      .sort();
  }

  private async readDirectories(dir: string): Promise<readonly Dirent[]> {
    try {
      return await readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const absolutePath = path.join(this.rootDir, relativePath);
    try {
      await access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async storyAffectsUnit(storyId: string, unitId: string): Promise<boolean> {
    if (!CROSS_WORK_ITEM_PATTERN.test(storyId)) {
      return true;
    }

    let content: string;
    try {
      content = await readFile(
        path.join(this.rootDir, this.inceptionRoot, "_cross", storyId, "description.md"),
        "utf8",
      );
    } catch {
      return true;
    }

    const frontmatter = FRONTMATTER_PATTERN.exec(content)?.[1];
    if (frontmatter === undefined) {
      return true;
    }

    const affects = AFFECTS_INLINE_PATTERN.exec(frontmatter)?.[1]
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (affects === undefined) {
      return true;
    }

    return affects.includes(unitId);
  }

  async fileContainsStoryAnnotation(productPath: string, storyId: string): Promise<boolean> {
    const absolutePath = path.join(this.rootDir, productPath);

    let content: string;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      return false;
    }

    // `@story-id` / `@issue-id` / `@work-item-id` 直後にカンマ/空白区切りで
    // 列挙される ID を抽出。
    // 例: `@story-id US-001`, `@work-item-id WI-001, WI-002`,
    //     `<!-- @issue-id ISSUE-026 -->`
    // capture[1] がアノテーション種別（未使用・将来拡張用）、capture[2] が ID 本体。
    // 行末または `-->` まで（ID 自体の `-` を許容するため `-->` を明示終端に使う）。
    const annotationIds = this.extractAnnotationIds(content);
    if (annotationIds.includes(storyId)) {
      return true;
    }

    const legacyId = await this.readLegacyId(storyId);
    return legacyId !== null && annotationIds.includes(legacyId);
  }

  private extractAnnotationIds(content: string): readonly string[] {
    const ids: string[] = [];

    const annotationPattern = /@(story-id|issue-id|work-item-id)[ \t]+([^\n\r]+)/g;
    let match = annotationPattern.exec(content);
    while (match !== null) {
      // `-->` 以降の HTML コメント閉じ記号を取り除く
      const raw = match[2].replace(/-->.*$/, "");
      ids.push(
        ...raw
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      );
      match = annotationPattern.exec(content);
    }

    return ids;
  }

  private async readLegacyId(storyId: string): Promise<string | null> {
    if (!CROSS_WORK_ITEM_PATTERN.test(storyId)) {
      return null;
    }

    let content: string;
    try {
      content = await readFile(
        path.join(this.rootDir, this.inceptionRoot, "_cross", storyId, "description.md"),
        "utf8",
      );
    } catch {
      return null;
    }

    const frontmatter = FRONTMATTER_PATTERN.exec(content)?.[1];
    if (frontmatter === undefined) {
      return null;
    }

    return LEGACY_ID_PATTERN.exec(frontmatter)?.[1] ?? null;
  }
}
