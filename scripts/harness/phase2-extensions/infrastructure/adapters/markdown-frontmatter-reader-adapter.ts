/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseFrontmatterFlags } from '../../../traceability-model/infrastructure/parsers/frontmatter-flag-parser.js';
import type {
  FrontmatterReadResult,
  FrontmatterReaderPort,
} from '../../domain/ports/frontmatter-reader-port.js';

const FRONTMATTER_INITIAL_CREATION_PATTERN =
  /^---\r?\n[\s\S]*?^\s*initial_creation\s*:\s*(.+)\s*$/m;

export class MarkdownFrontmatterReaderAdapter implements FrontmatterReaderPort {
  constructor(private readonly projectRoot: string) {}

  async read(filePath: string): Promise<FrontmatterReadResult> {
    try {
      const absolutePath = path.resolve(this.projectRoot, filePath);
      const content = await fs.readFile(absolutePath, 'utf8');

      try {
        const initialCreationMatch = FRONTMATTER_INITIAL_CREATION_PATTERN.exec(content);
        if (initialCreationMatch) {
          const rawValue = initialCreationMatch[1].trim();
          if (rawValue !== 'true' && rawValue !== 'false') {
            throw new Error(
              `traceability.initial_creation の値が不正です（true/false のみ許容）: ${rawValue}`,
            );
          }
        }

        const parsed = parseFrontmatterFlags(content);
        return {
          filePath,
          flags: { initialCreation: parsed.initialCreation },
          parseError: null,
        };
      } catch (error) {
        return {
          filePath,
          flags: null,
          parseError: error instanceof Error ? error.message : 'unknown parse error',
        };
      }
    } catch (error) {
      return {
        filePath,
        flags: null,
        parseError: error instanceof Error ? `read failed: ${error.message}` : 'read failed',
      };
    }
  }
}
