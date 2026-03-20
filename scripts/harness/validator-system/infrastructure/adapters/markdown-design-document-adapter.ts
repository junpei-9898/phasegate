/**
 * @layer infrastructure
 * @unit validator-system
 *
 * MarkdownDesignDocumentAdapter — DesignDocumentPort実装
 */
import type { DesignDocumentPort, StructuredDesignDoc } from '../../domain/ports/design-document-port.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export class MarkdownDesignDocumentAdapter implements DesignDocumentPort {
  private readonly docsRoot: string;
  private readonly cache = new Map<string, StructuredDesignDoc>();

  constructor(docsRoot: string) {
    this.docsRoot = docsRoot;
  }

  async loadDesignDocuments(targetUnits?: readonly string[]): Promise<readonly StructuredDesignDoc[]> {
    // stub実装: 実際の実装ではMarkdownを解析して構造化データを返す
    return [];
  }

  async getLayerAnnotations(targetDocs?: readonly string[]): Promise<Record<string, string>> {
    return {};
  }

  async getElements(targetUnits?: readonly string[]): Promise<string[]> {
    return [];
  }
}
