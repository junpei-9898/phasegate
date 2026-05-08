/**
 * @layer infrastructure
 * @unit validator-system
 *
 * MarkdownDesignDocumentAdapter — DesignDocumentPort実装
 */
import type { DesignDocumentPort, StructuredDesignDoc } from '../../domain/ports/design-document-port.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ADR_PATTERN = /ADR-\d{3}/g;

// ISSUE-005 P3-8: メタ見出し / 議論用セクションを drift 対象から除外するマーカー。
// 見出し行の直後 (同一行末 or 次の非空行) に置かれたコメントを拾う。
const SKIP_MARKER = /<!--\s*@drift-check\s*:\s*skip\s*-->/i;

// 見出し文字列のうち、デフォルトで drift 対象から外す既知のメタパターン。
// Unit 設計ドキュメントで頻出する「議論用」「自己評価」系セクション。
const DEFAULT_META_HEADING_PATTERNS = [
  /engineering[- ]perspective/i,
  /自己評価/,
  /レビュー(観点|コメント)/,
  /議論/,
  /TODO|未決事項|Open\s+Questions?/i,
  /変更履歴|Change\s*Log/i,
  /参考文献|References?/i,
];

function isMetaHeading(name: string): boolean {
  return DEFAULT_META_HEADING_PATTERNS.some((p) => p.test(name));
}

function extractConceptNames(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const headings: string[] = [];
  const headingRegex = /^(#{2,3})\s+(.+?)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const m = headingRegex.exec(lines[i]);
    if (!m) continue;
    const name = m[2].trim();
    // 見出し行自体にスキップマーカーが付いている
    if (SKIP_MARKER.test(lines[i])) continue;
    // 次の非空行にスキップマーカーが付いている
    // ただし、次行が新しい見出しの場合はそれ自身の注釈なので無視する
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (
      j < lines.length &&
      !headingRegex.test(lines[j]) &&
      SKIP_MARKER.test(lines[j])
    ) continue;
    // 既知のメタ見出しは暗黙的にスキップ
    if (isMetaHeading(name)) continue;
    // 名前から末尾のスキップマーカーを落とす (念のため)
    // WI-091 finding #5: `（〜）` / `(〜)` qualifier (例: `（エンティティ・新規）`) を strip
    // して code 側の class 名と exact match できるようにする
    const stripped = name
      .replace(SKIP_MARKER, '')
      .replace(/[（(][^）)]*[）)]/g, '')
      .trim();
    if (stripped.length > 0) {
      headings.push(stripped);
    }
  }
  return headings;
}

export class MarkdownDesignDocumentAdapter implements DesignDocumentPort {
  private readonly docsRoot: string;
  private readonly cache = new Map<string, StructuredDesignDoc>();

  constructor(docsRoot: string) {
    this.docsRoot = docsRoot;
  }

  async loadDesignDocuments(targetUnits?: readonly string[]): Promise<readonly StructuredDesignDoc[]> {
    const unitNames = targetUnits && targetUnits.length > 0
      ? [...targetUnits]
      : await this.listUnitNames();
    const results: StructuredDesignDoc[] = [];

    for (const unitName of unitNames) {
      const docPath = join(this.docsRoot, unitName, 'domain_model.md');
      const cached = this.cache.get(docPath);
      if (cached) {
        results.push(cached);
        continue;
      }

      try {
        const markdown = await readFile(docPath, 'utf8');
        const doc: StructuredDesignDoc = {
          unitName,
          docPath,
          concepts: extractConceptNames(markdown).map((name) => ({ name, type: 'class' })),
          layerDependencies: [],
          adrRefs: Array.from(new Set(markdown.match(ADR_PATTERN) ?? [])),
        };
        this.cache.set(docPath, doc);
        results.push(doc);
      } catch {
        continue;
      }
    }

    return results;
  }

  async getLayerAnnotations(targetDocs?: readonly string[]): Promise<Record<string, string>> {
    return {};
  }

  async getElements(targetUnits?: readonly string[]): Promise<string[]> {
    const docs = await this.loadDesignDocuments(targetUnits);
    return docs.flatMap((doc) => doc.concepts.map((concept) => concept.name));
  }

  /**
   * ISSUE-005 P3-9: element 名から unit 名を引けるマップを返す。
   * 同名 element が複数 unit に存在する場合は最初に見つかった unit を採用する。
   */
  async getElementUnitMap(targetUnits?: readonly string[]): Promise<Record<string, string>> {
    const docs = await this.loadDesignDocuments(targetUnits);
    const map: Record<string, string> = {};
    for (const doc of docs) {
      for (const concept of doc.concepts) {
        if (!(concept.name in map)) {
          map[concept.name] = doc.unitName;
        }
      }
    }
    return map;
  }

  private async listUnitNames(): Promise<string[]> {
    try {
      const entries = await readdir(this.docsRoot, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }
}
