/**
 * @layer infrastructure
 * @unit phase-dependency-model
 * @work-item-id WI-115
 */

import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { StoryReflectionFileSystemPort } from "../../domain/ports/story-reflection-file-system-port.js";

const CROSS_WORK_ITEM_PATTERN = /^WI-\d+$/;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;
const AFFECTS_INLINE_PATTERN = /^affects:\s*\[([^\]]*)\]\s*$/m;
const LEGACY_ID_PATTERN = /^legacy_id:\s*([A-Z][\w]+-\d+)\s*$/m;
/** コミット本文の `Work-Item: WI-NNN` trailer 行から WI を抽出する */
const WORK_ITEM_TRAILER_PATTERN = /^Work-Item:\s*(WI-\d+)\s*$/gm;
/** ソースファイル先頭の `@work-item-id` / `@story` タグ配下の WI を抽出する */
const SOURCE_TAG_PATTERN = /@(?:work-item-id|story)\b[^\n\r]*/g;
/** harness ソースパスから unit / layer を切り出す（帰属フィルタ適用対象の判定） */
const HARNESS_SOURCE_PATH_PATTERN = /^scripts\/harness\/[^/]+\/[^/]+\//;
const execFileAsync = promisify(execFile);

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
  private readonly changedPathsByStoryId = new Map<string, Promise<ReadonlySet<string>>>();

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
      .filter((name) => !name.startsWith("_") && !name.startsWith("."))
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
      return false;
    }

    const affects = AFFECTS_INLINE_PATTERN.exec(frontmatter)?.[1]
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (affects === undefined) {
      return false;
    }

    return affects.includes(unitId);
  }

  async storyTouchesUnitLayer(storyId: string, unitId: string, layer: string): Promise<boolean> {
    const paths = await this.readChangedPathsForStory(storyId);
    const prefix = `scripts/harness/${unitId}/${layer}/`;

    for (const changedPath of paths) {
      if (changedPath.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  private readChangedPathsForStory(storyId: string): Promise<ReadonlySet<string>> {
    const cached = this.changedPathsByStoryId.get(storyId);
    if (cached !== undefined) {
      return cached;
    }

    const promise = this.fetchChangedPathsForStory(storyId);
    this.changedPathsByStoryId.set(storyId, promise);
    return promise;
  }

  private async fetchChangedPathsForStory(storyId: string): Promise<ReadonlySet<string>> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        [
          "log",
          "--format=@@COMMIT@@%x00%B%x00",
          "--name-only",
          "--grep",
          `Work-Item:.*\\b${storyId}\\b`,
        ],
        { cwd: this.rootDir, maxBuffer: 32 * 1024 * 1024 },
      );

      return await this.extractChangedPathsForStory(stdout, storyId);
    } catch {
      return new Set<string>();
    }
  }

  private async extractChangedPathsForStory(output: string, storyId: string): Promise<ReadonlySet<string>> {
    const changedPaths = new Set<string>();
    const trailerPattern = new RegExp(`Work-Item:[^\\n]*\\b${storyId}\\b`);

    for (const commitBlock of output.split("@@COMMIT@@\u0000")) {
      if (commitBlock.length === 0) continue;

      const bodyEnd = commitBlock.indexOf("\u0000");
      if (bodyEnd === -1) continue;

      const body = commitBlock.slice(0, bodyEnd);
      if (!trailerPattern.test(body)) continue;

      // 複数 Work-Item trailer を同梱するバッチコミットでは、changed paths が
      // 全 trailer WI に一律帰属してしまう（over-attribution）。ソースパスに限り
      // ファイルの帰属タグで storyId への帰属を絞り込む（WI-251）。
      const isMultiWorkItemCommit = this.countWorkItemTrailers(body) >= 2;
      const nameOnly = commitBlock.slice(bodyEnd + 1);
      for (const changedPath of nameOnly.split(/\r?\n/)) {
        const trimmedPath = changedPath.trim();
        if (trimmedPath.length === 0 || trimmedPath === "@@COMMIT@@") continue;

        if (await this.pathAttributesToStory(trimmedPath, storyId, isMultiWorkItemCommit)) {
          changedPaths.add(trimmedPath);
        }
      }
    }

    return changedPaths;
  }

  private countWorkItemTrailers(body: string): number {
    return body.match(WORK_ITEM_TRAILER_PATTERN)?.length ?? 0;
  }

  /**
   * バッチコミットの changed path を storyId に帰属させてよいか判定する。
   * - 単一 WI trailer コミット → 常に帰属（現行挙動を維持）
   * - 複数 WI trailer × 非ソースパス → 帰属（絞り込み対象外）
   * - 複数 WI trailer × ソースパス → ファイル内容(HEAD)のタグに storyId を含むときのみ帰属。
   *   タグ無し / ファイルが読めない → fail-closed で帰属維持（反映要求を緩めない）。
   */
  private async pathAttributesToStory(
    changedPath: string,
    storyId: string,
    isMultiWorkItemCommit: boolean,
  ): Promise<boolean> {
    if (!isMultiWorkItemCommit) {
      return true;
    }

    if (!HARNESS_SOURCE_PATH_PATTERN.test(changedPath)) {
      return true;
    }

    const tags = await this.readSourceWorkItemTags(changedPath);
    if (tags === null || tags.size === 0) {
      return true;
    }

    return tags.has(storyId);
  }

  private async readSourceWorkItemTags(relativePath: string): Promise<Set<string> | null> {
    let content: string;
    try {
      content = await readFile(path.join(this.rootDir, relativePath), "utf8");
    } catch {
      return null;
    }

    const tags = new Set<string>();
    for (const line of content.match(SOURCE_TAG_PATTERN) ?? []) {
      for (const id of line.match(/WI-\d+/g) ?? []) {
        tags.add(id);
      }
    }

    return tags;
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
    if (legacyId === null || !annotationIds.includes(legacyId)) {
      return false;
    }

    const unitId = this.extractProductUnitId(productPath);
    return !(await this.isAmbiguousLegacyId(legacyId, storyId, unitId));
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

    for (const candidate of await this.listDescriptionCandidates(storyId)) {
      const legacyId = await this.tryReadLegacyId(candidate);
      if (legacyId !== null) return legacyId;
    }

    return null;
  }

  private extractProductUnitId(productPath: string): string | null {
    const normalized = productPath.split(path.sep).join("/");
    const match = /^docs\/product\/construction\/([^/]+)\//.exec(normalized);
    return match?.[1] ?? null;
  }

  private async isAmbiguousLegacyId(legacyId: string, storyId: string, unitId: string | null): Promise<boolean> {
    const scopedStoryIds = unitId === null
      ? await this.listAllWorkItemDirectories()
      : await this.listStoryDirectories(unitId);
    const matchingStoryIds: string[] = [];

    for (const candidateStoryId of scopedStoryIds) {
      const candidateLegacyId = await this.readLegacyId(candidateStoryId);
      if (candidateLegacyId === legacyId) {
        matchingStoryIds.push(candidateStoryId);
      }
    }

    return matchingStoryIds.length > 1 || (matchingStoryIds.length === 1 && matchingStoryIds[0] !== storyId);
  }

  private async listAllWorkItemDirectories(): Promise<readonly string[]> {
    const ids = new Set<string>();
    for (const id of await this.listCrossWorkItemDirectories()) {
      ids.add(id);
    }

    const inceptionDir = path.join(this.rootDir, this.inceptionRoot);
    for (const entry of await this.readDirectories(inceptionDir)) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith("_") || name.startsWith(".") || name === "issues") continue;
      for (const id of await this.listUnitWorkItemDirectories(name)) {
        ids.add(id);
      }
    }

    return [...ids].sort();
  }

  private async listDescriptionCandidates(storyId: string): Promise<readonly string[]> {
    const inceptionDir = path.join(this.rootDir, this.inceptionRoot);
    const candidates: string[] = [path.join(inceptionDir, "_cross", storyId, "description.md")];

    for (const entry of await this.readDirectories(inceptionDir)) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith("_") || name.startsWith(".") || name === "issues") continue;
      candidates.push(path.join(inceptionDir, name, storyId, "description.md"));
    }

    return candidates;
  }

  private async tryReadLegacyId(absolutePath: string): Promise<string | null> {
    let content: string;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      return null;
    }

    const frontmatter = FRONTMATTER_PATTERN.exec(content)?.[1];
    if (frontmatter === undefined) return null;

    return LEGACY_ID_PATTERN.exec(frontmatter)?.[1] ?? null;
  }
}
