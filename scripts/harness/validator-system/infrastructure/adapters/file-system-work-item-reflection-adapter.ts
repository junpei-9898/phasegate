/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-217
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type {
  WorkItemReflectionPort,
  WorkItemReflectionSnapshot,
} from '../../domain/services/l4/consistency-check-service.js';

const DESCRIPTION_FILE = 'description.md';
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;
const WORK_ITEM_ANNOTATION_PATTERN = /@work-item-id\s+([^<\r\n]+)/g;

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

async function listFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await listFiles(path)));
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
    return files;
  } catch {
    return [];
  }
}

function extractFrontmatterValue(markdown: string, key: string): string | undefined {
  const frontmatter = FRONTMATTER_PATTERN.exec(markdown)?.[1];
  if (!frontmatter) return undefined;
  const pattern = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm');
  return pattern.exec(frontmatter)?.[1]?.replace(/^["']|["']$/g, '').trim();
}

function extractWorkItemRefs(markdown: string): string[] {
  const refs = new Set<string>();
  for (const match of markdown.matchAll(WORK_ITEM_ANNOTATION_PATTERN)) {
    const raw = match[1].replace(/-->.*/, '');
    for (const token of raw.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean)) {
      if (/^[A-Za-z][A-Za-z0-9_-]*-\d+(?:-\d+)*$/.test(token)) {
        refs.add(token);
      }
    }
  }
  return [...refs];
}

export class FileSystemWorkItemReflectionAdapter implements WorkItemReflectionPort {
  constructor(private readonly projectRoot: string) {}

  async collect(input: {
    readonly inceptionRoot: string;
    readonly designRoot: string;
  }): Promise<WorkItemReflectionSnapshot> {
    const inceptionRoot = join(this.projectRoot, input.inceptionRoot);
    const designRoot = join(this.projectRoot, input.designRoot);
    const descriptionFiles = (await listFiles(inceptionRoot))
      .filter((path) => path.endsWith(`/${DESCRIPTION_FILE}`));

    if (descriptionFiles.length === 0) {
      return {
        workItems: [],
        productRefs: [],
        skipReason: `no work item descriptions found under ${input.inceptionRoot}`,
      };
    }

    const workItems: Array<WorkItemReflectionSnapshot['workItems'][number]> = [];
    for (const path of descriptionFiles) {
      const markdown = await readFile(path, 'utf8');
      const id = extractFrontmatterValue(markdown, 'id');
      if (!id) continue;
      workItems.push({
        id,
        path: normalizePath(relative(this.projectRoot, path)),
        type: extractFrontmatterValue(markdown, 'type'),
      });
    }

    const productRefs: Array<WorkItemReflectionSnapshot['productRefs'][number]> = [];
    const productFiles = (await listFiles(designRoot)).filter((path) => path.endsWith('.md'));
    for (const path of productFiles) {
      const markdown = await readFile(path, 'utf8');
      for (const id of extractWorkItemRefs(markdown)) {
        productRefs.push({ id, path: normalizePath(relative(this.projectRoot, path)) });
      }
    }

    return { workItems, productRefs };
  }
}
