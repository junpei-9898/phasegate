/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DocumentScannerPort } from '../../domain/ports/document-scanner-port.js';

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function toPatternRegex(pattern: string): RegExp {
  let regex = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];
    const afterNext = pattern[index + 2];

    if (current === '*' && next === '*') {
      if (afterNext === '/') {
        regex += '(?:.*/)?';
        index += 2;
      } else {
        regex += '.*';
        index += 1;
      }
      continue;
    }

    if (current === '*') {
      regex += '[^/]*';
      continue;
    }

    regex += escapeRegex(current);
  }

  return new RegExp(`${regex}$`);
}

async function walk(root: string, current = ''): Promise<string[]> {
  const absoluteDir = path.join(root, current);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    const relativePath = current ? path.posix.join(current, entry.name) : entry.name;
    const absolutePath = path.join(root, relativePath);

    if (entry.isDirectory()) {
      results.push(...(await walk(root, relativePath)));
    } else if (entry.isFile()) {
      const stat = await fs.stat(absolutePath);
      if (stat.isFile()) {
        results.push(relativePath);
      }
    }
  }

  return results;
}

export class FileSystemDocumentScannerAdapter implements DocumentScannerPort {
  constructor(private readonly projectRoot: string) {}

  async scan(pattern: string): Promise<string[]> {
    const files = await walk(this.projectRoot);
    const regex = toPatternRegex(pattern);
    return files.filter((file) => regex.test(file)).sort();
  }
}
