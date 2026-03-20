/**
 * @layer infrastructure
 * @unit harness-error
 */
import { readFile } from 'node:fs/promises';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AdrExistenceCheckerPort } from '../../domain/ports/adr-existence-checker-port.js';
import type { AdrRef } from '../../domain/value-objects/adr-ref.js';

const ADR_ID_PATTERN = /^\s*adr_id\s*:\s*["']?([0-9]{3})["']?\s*$/m;

export interface FileSystemAdrExistenceCheckerAdapterDeps {
  readonly rootDir: string;
}

export class FileSystemAdrExistenceCheckerAdapter
  implements AdrExistenceCheckerPort
{
  private readonly rootDir: string;

  constructor(deps: FileSystemAdrExistenceCheckerAdapterDeps) {
    this.rootDir = deps.rootDir;
  }

  async exists(adrRef: AdrRef): Promise<boolean> {
    const adrDir = path.join(this.rootDir, 'docs', 'ADR');
    if (!fs.existsSync(adrDir)) {
      return false;
    }

    const filePath = path.join(adrDir, `${adrRef.toString()}.md`);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const content = await readFile(filePath, 'utf8');
    const match = content.match(ADR_ID_PATTERN);
    if (!match) {
      return false;
    }

    const expectedAdrId = adrRef.toString().slice('ADR-'.length);
    return match[1] === expectedAdrId;
  }
}
