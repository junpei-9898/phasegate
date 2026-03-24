/**
 * @layer infrastructure
 * @unit validator-system
 *
 * MarkdownDesignDocumentAdapter — DesignDocumentPort実装
 */
import type { DesignDocumentPort, StructuredDesignDoc } from '../../domain/ports/design-document-port.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SECTION_PATTERN = /^#{2,3}\s+(.+)/gm;
const ADR_PATTERN = /ADR-\d{3}/g;

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
          concepts: Array.from(markdown.matchAll(SECTION_PATTERN), (match) => ({
            name: match[1].trim(),
            type: 'class',
          })),
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

  private async listUnitNames(): Promise<string[]> {
    try {
      const entries = await readdir(this.docsRoot, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }
}
