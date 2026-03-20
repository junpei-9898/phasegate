/**
 * @layer infrastructure
 * @unit adr-foundation
 */
import { readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { ADR } from '../../domain/aggregates/adr.js';
import type { AdrDocumentParserPort } from '../../domain/ports/adr-document-parser-port.js';
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import { AdrValidationService } from '../../domain/services/adr-validation-service.js';
import { AdrFilePath } from '../../domain/value-objects/adr-file-path.js';
import { AdrId } from '../../domain/value-objects/adr-id.js';
import type { AdrStatus } from '../../domain/value-objects/adr-status.js';

const TEMPLATE_FILENAME = 'template.md';
const ADR_FILE_PATTERN = /^[0-9]{3}-[a-z0-9-]+\.md$/;

export class FileSystemAdrRepository implements AdrRepositoryPort {
  private readonly rootDir: string;
  private readonly documentParser: AdrDocumentParserPort;

  constructor(rootDir: string, documentParser: AdrDocumentParserPort) {
    this.rootDir = rootDir;
    this.documentParser = documentParser;
  }

  async findById(id: AdrId): Promise<ADR | null> {
    const allAdrs = await this.loadAll();
    return allAdrs.find((adr) => adr.id.equals(id)) ?? null;
  }

  async findByRef(adrRef: string): Promise<ADR | null> {
    const id = AdrId.create(adrRef);
    return this.findById(id);
  }

  async findAll(filters?: {
    statuses?: AdrStatus[];
    includeTemplate?: boolean;
  }): Promise<ADR[]> {
    const allAdrs = await this.loadAll();

    if (!filters?.statuses?.length) {
      return allAdrs;
    }

    return allAdrs.filter((adr) =>
      filters.statuses!.some((status) => adr.getStatus().equals(status)),
    );
  }

  async save(adr: ADR): Promise<void> {
    const filePath = AdrFilePath.fromAdr(adr.id, adr.getFrontmatter().title);
    const markdown = this.documentParser.serializeDocument(adr);
    const absolutePath = path.join(this.rootDir, filePath.value.replace('docs/ADR/', ''));

    const existingFile = await this.findExistingFile(adr.id);
    if (existingFile) {
      const existingAbsolutePath = path.join(this.rootDir, existingFile);
      if (existingAbsolutePath !== absolutePath) {
        await rename(existingAbsolutePath, absolutePath);
      }
    }

    await writeFile(absolutePath, markdown, 'utf8');
  }

  async exists(id: AdrId): Promise<boolean> {
    const adr = await this.findById(id);
    return adr !== null;
  }

  async nextId(): Promise<AdrId> {
    const allAdrs = await this.loadAll();
    if (allAdrs.length === 0) {
      return AdrId.create('001');
    }

    const maxNumber = Math.max(...allAdrs.map((adr) => adr.id.toNumber()));
    const nextNumber = maxNumber + 1;
    return AdrId.create(String(nextNumber).padStart(3, '0'));
  }

  private async loadAll(): Promise<ADR[]> {
    const files = await this.listAdrFiles();
    const adrs: ADR[] = [];
    const validationService = new AdrValidationService();

    for (const file of files) {
      const absolutePath = path.join(this.rootDir, file);
      const content = await readFile(absolutePath, 'utf8');
      const document = this.documentParser.parseDocument(content);
      const adr = ADR.reconstitute(document, validationService);
      adrs.push(adr);
    }

    return adrs.sort((a, b) => a.id.compare(b.id));
  }

  private async listAdrFiles(): Promise<string[]> {
    try {
      const entries = await readdir(this.rootDir);
      return entries
        .filter((entry) => entry !== TEMPLATE_FILENAME && ADR_FILE_PATTERN.test(entry));
    } catch {
      return [];
    }
  }

  private async findExistingFile(id: AdrId): Promise<string | null> {
    const files = await this.listAdrFiles();
    const prefix = `${id.value}-`;
    return files.find((f) => f.startsWith(prefix)) ?? null;
  }
}
