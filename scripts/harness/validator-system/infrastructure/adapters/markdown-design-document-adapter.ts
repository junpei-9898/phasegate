/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-117, WI-118
 *
 * MarkdownDesignDocumentAdapter — DesignDocumentPort実装
 */
import type { DesignDocumentPort, StructuredDesignDoc } from '../../domain/ports/design-document-port.js';
import type { DriftElementRecord } from '../../domain/services/l4/drift-detection-service.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ADR_PATTERN = /ADR-\d{3}/g;
const WORK_ITEM_PATTERN = /@work-item-id\s+(WI-\d{3})/g;
const LAYER_PATTERN = /@layer\s+([a-z0-9-]+)/gi;
const UNIT_PATTERN = /@unit\s+([a-z0-9-]+)/gi;
const CONSTRUCTION_DOC_NAMES = [
  'domain_model.md',
  'logical_design.md',
  'unit_test_design.md',
  'it_test_design.md',
];

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

function extractPointerLines(lines: readonly string[], startIndex: number, headingRegex: RegExp): string[] {
  const pointers: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (headingRegex.test(line)) break;

    const commentMatch = /<!--\s*pointers?\s*:\s*(.+?)\s*-->/i.exec(line);
    if (commentMatch) {
      pointers.push(...commentMatch[1].split(',').map((p) => p.trim()).filter(Boolean));
      continue;
    }

    const blockStartMatch = /^<pointers>\s*$/i.exec(line.trim());
    if (blockStartMatch) {
      for (let j = i + 1; j < lines.length; j++) {
        const blockLine = lines[j].trim();
        if (/^<\/pointers>\s*$/i.test(blockLine)) {
          i = j;
          break;
        }
        const itemMatch = /^-\s+(.+?)\s*$/.exec(blockLine);
        if (itemMatch) pointers.push(itemMatch[1].trim());
      }
      continue;
    }
  }

  return Array.from(new Set(pointers));
}

function extractConcepts(markdown: string): Array<{ name: string; pointers?: readonly string[] }> {
  const lines = markdown.split(/\r?\n/);
  const concepts: Array<{ name: string; pointers?: readonly string[] }> = [];
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
      const pointers = extractPointerLines(lines, i, headingRegex);
      concepts.push(pointers.length > 0 ? { name: stripped, pointers } : { name: stripped });
    }
  }
  return concepts;
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
      for (const docName of CONSTRUCTION_DOC_NAMES) {
        const docPath = join(this.docsRoot, unitName, docName);
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
            concepts: extractConcepts(markdown).map((concept) => ({ ...concept, type: 'class' })),
            layerDependencies: extractLayerDependencies(markdown),
            adrRefs: Array.from(new Set(markdown.match(ADR_PATTERN) ?? [])),
          };
          this.cache.set(docPath, doc);
          results.push(doc);
        } catch {
          continue;
        }
      }
    }

    return results;
  }

  async getLayerAnnotations(targetDocs?: readonly string[]): Promise<Record<string, string>> {
    const docs = targetDocs && targetDocs.length > 0
      ? await this.loadExplicitDocs(targetDocs)
      : await this.loadDesignDocuments();
    const annotations: Record<string, string> = {};

    for (const doc of docs) {
      const markdown = await readFile(doc.docPath, 'utf8');
      const layers = Array.from(new Set(Array.from(markdown.matchAll(LAYER_PATTERN)).map((match) => match[1])));
      const units = Array.from(new Set(Array.from(markdown.matchAll(UNIT_PATTERN)).map((match) => match[1])));
      const workItems = Array.from(new Set(Array.from(markdown.matchAll(WORK_ITEM_PATTERN)).map((match) => match[1])));

      for (const layer of layers) {
        annotations[`${doc.docPath}#layer:${layer}`] = isKnownLayer(layer) ? 'layer:known' : 'layer:unknown';
      }
      for (const unit of units) {
        annotations[`${doc.docPath}#unit:${unit}`] = unit === doc.unitName ? 'unit:matched' : `unit:mismatch:${doc.unitName}`;
      }
      for (const adrRef of doc.adrRefs) {
        annotations[adrRef] = 'adr:referenced';
      }
      for (const workItemId of workItems) {
        annotations[`${doc.docPath}#work-item:${workItemId}`] = 'work-item:referenced';
      }
    }

    return annotations;
  }

  async getElements(targetUnits?: readonly string[]): Promise<string[]> {
    const docs = await this.loadDesignDocuments(targetUnits);
    return docs.flatMap((doc) => doc.concepts.map((concept) => concept.name));
  }

  async getElementRecords(targetUnits?: readonly string[]): Promise<readonly DriftElementRecord[]> {
    const docs = await this.loadDesignDocuments(targetUnits);
    return docs.flatMap((doc) =>
      doc.concepts.map((concept) => ({
        element: concept.name,
        unitName: doc.unitName,
        pointers: concept.pointers ?? [],
      }))
    );
  }

  async getElementPointers(targetUnits?: readonly string[]): Promise<Record<string, readonly string[]>> {
    const docs = await this.loadDesignDocuments(targetUnits);
    const map: Record<string, readonly string[]> = {};
    for (const doc of docs) {
      for (const concept of doc.concepts) {
        if (concept.pointers && concept.pointers.length > 0) {
          map[concept.name] = concept.pointers;
        }
      }
    }
    return map;
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

  private async loadExplicitDocs(targetDocs: readonly string[]): Promise<readonly StructuredDesignDoc[]> {
    const docs: StructuredDesignDoc[] = [];
    for (const docPath of targetDocs) {
      try {
        const markdown = await readFile(docPath, 'utf8');
        const unitName = inferUnitNameFromDocPath(this.docsRoot, docPath);
        docs.push({
          unitName,
          docPath,
          concepts: extractConcepts(markdown).map((concept) => ({ ...concept, type: 'class' })),
          layerDependencies: extractLayerDependencies(markdown),
          adrRefs: Array.from(new Set(markdown.match(ADR_PATTERN) ?? [])),
        });
      } catch {
        continue;
      }
    }
    return docs;
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

function extractLayerDependencies(markdown: string): Array<{ from: string; to: string }> {
  const dependencies: Array<{ from: string; to: string }> = [];
  const dependencyPattern = /([a-z0-9-]+)\s*(?:->|→)\s*([a-z0-9-]+)/gi;
  for (const match of markdown.matchAll(dependencyPattern)) {
    dependencies.push({ from: match[1], to: match[2] });
  }
  return dependencies;
}

function isKnownLayer(layer: string): boolean {
  return ['domain', 'application', 'infrastructure', 'presentation', 'test'].includes(layer);
}

function inferUnitNameFromDocPath(docsRoot: string, docPath: string): string {
  const normalizedRoot = docsRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  const normalizedPath = docPath.replace(/\\/g, '/');
  const relativePath = normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : normalizedPath;
  return relativePath.split('/')[0] || 'unknown';
}
