/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-156
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  SkillCatalogSnapshot,
  SkillCategoryDeclaration,
  SkillCountDeclaration,
} from '../../domain/services/l4/skill-catalog-drift-service.js';
import type { SkillCatalogDriftPort } from '../../domain/ports/skill-catalog-drift-port.js';

const MAINTAINED_COUNT_DOCS = [
  'skills/README.md',
  'README.md',
  'DEVELOPMENT.md',
  'docs/guide/installation.md',
  'docs/guide/quick-vs-full-mode.md',
  'docs/guide/skills-overview.md',
] as const;

const TOTAL_COUNT_PATTERNS = [
  /\b(?:provides|contains|deploys)\s+(\d+)\s+skills\b/gi,
  /\bfull catalogue of\s+(\d+)\s+skills\b/gi,
  /--\s*(\d+)\s+skills\b/gi,
  /#\s*(\d+)\s+skills\b/gi,
  /配布対象は\s+(\d+)\s+skills\s+です/g,
] as const;

const CATEGORY_PATTERN = /^###\s+(.+?)\s+\((\d+)\s+skills\)\s*$/gm;

export class FileSystemSkillCatalogDriftAdapter implements SkillCatalogDriftPort {
  constructor(private readonly cwd: string = process.cwd()) {}

  async collect(): Promise<SkillCatalogSnapshot> {
    const actualSkillNames = await this.readActualSkillNames();
    const countDeclarations: SkillCountDeclaration[] = [];
    let categoryDeclarations: SkillCategoryDeclaration[] = [];

    for (const relativePath of MAINTAINED_COUNT_DOCS) {
      const text = await this.readOptional(relativePath);
      if (text === null) continue;
      countDeclarations.push(...this.extractCountDeclarations(relativePath, text));
      if (relativePath === 'docs/guide/skills-overview.md') {
        categoryDeclarations = this.extractCategoryDeclarations(relativePath, text);
      }
    }

    return {
      actualSkillNames,
      countDeclarations,
      categoryDeclarations,
    };
  }

  private async readActualSkillNames(): Promise<readonly string[]> {
    const skillsRoot = join(this.cwd, 'skills');
    let entries;
    try {
      entries = await readdir(skillsRoot, { withFileTypes: true });
    } catch {
      return Object.freeze([]);
    }
    const skillNames: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = `skills/${entry.name}/SKILL.md`;
      const text = await this.readOptional(skillPath);
      if (text !== null) skillNames.push(entry.name);
    }
    return Object.freeze(skillNames.sort((a, b) => a.localeCompare(b)));
  }

  private async readOptional(relativePath: string): Promise<string | null> {
    try {
      return await readFile(join(this.cwd, relativePath), 'utf-8');
    } catch {
      return null;
    }
  }

  private extractCountDeclarations(sourcePath: string, text: string): SkillCountDeclaration[] {
    const declarations: SkillCountDeclaration[] = [];
    for (const pattern of TOTAL_COUNT_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        const rawCount = match[1];
        const index = match.index;
        if (!rawCount || index === undefined) continue;
        if (this.lineTextAt(text, index).trimStart().startsWith('###')) continue;
        declarations.push({
          sourcePath,
          declaredCount: Number.parseInt(rawCount, 10),
          line: this.lineOf(text, index),
        });
      }
    }
    return declarations;
  }

  private extractCategoryDeclarations(sourcePath: string, text: string): SkillCategoryDeclaration[] {
    return [...text.matchAll(CATEGORY_PATTERN)].flatMap((match) => {
      const categoryName = match[1];
      const rawCount = match[2];
      const index = match.index;
      if (!categoryName || !rawCount || index === undefined) return [];
      return [{
        sourcePath,
        categoryName,
        declaredCount: Number.parseInt(rawCount, 10),
        line: this.lineOf(text, index),
      }];
    });
  }

  private lineOf(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }

  private lineTextAt(text: string, index: number): string {
    const lineStart = text.lastIndexOf('\n', index - 1) + 1;
    const lineEnd = text.indexOf('\n', index);
    return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  }
}
