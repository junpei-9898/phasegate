/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import type { StoryReflectionFileSystemPort } from '../../domain/ports/story-reflection-file-system-port.js';

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
export class FileSystemStoryReflectionAdapter
  implements StoryReflectionFileSystemPort
{
  private readonly rootDir: string;
  private readonly inceptionRoot: string;

  constructor(deps: FileSystemStoryReflectionAdapterDeps) {
    this.rootDir = deps.rootDir;
    this.inceptionRoot = deps.inceptionRoot ?? 'docs/inception';
  }

  async listStoryDirectories(unitId: string): Promise<readonly string[]> {
    const unitDir = path.join(this.rootDir, this.inceptionRoot, unitId);

    let entries;
    try {
      entries = await readdir(unitDir, { withFileTypes: true });
    } catch {
      return [];
    }

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
      .sort();
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

  async fileContainsStoryAnnotation(
    productPath: string,
    storyId: string,
  ): Promise<boolean> {
    const absolutePath = path.join(this.rootDir, productPath);

    let content: string;
    try {
      content = await readFile(absolutePath, 'utf8');
    } catch {
      return false;
    }

    // `@story-id` / `@issue-id` / `@work-item-id` 直後にカンマ/空白区切りで
    // 列挙される ID を抽出。
    // 例: `@story-id US-001`, `@work-item-id WI-001, WI-002`,
    //     `<!-- @issue-id ISSUE-026 -->`
    // capture[1] がアノテーション種別（未使用・将来拡張用）、capture[2] が ID 本体。
    // 行末または `-->` まで（ID 自体の `-` を許容するため `-->` を明示終端に使う）。
    const annotationPattern = /@(story-id|issue-id|work-item-id)[ \t]+([^\n\r]+)/g;
    let match: RegExpExecArray | null;
    while ((match = annotationPattern.exec(content)) !== null) {
      // `-->` 以降の HTML コメント閉じ記号を取り除く
      const raw = match[2].replace(/-->.*$/, '');
      const ids = raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (ids.includes(storyId)) {
        return true;
      }
    }

    return false;
  }
}
