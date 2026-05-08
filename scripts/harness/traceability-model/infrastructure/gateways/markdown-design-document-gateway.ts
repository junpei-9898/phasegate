/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * docs/product/construction/{unit}/ 配下の設計文書を読み込み DesignDocumentPort を実装するゲートウェイ
 */

import * as fs from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import type { DesignDocumentPort } from "../../domain/ports/design-document-port.js";
import type { ProjectRelativePathLike } from "../../domain/value-objects/chain-link.js";
import { DesignDocumentFlags } from "../../domain/value-objects/design-document-flags.js";
import { ProjectRelativePath } from "../../domain/value-objects/project-relative-path.js";
import { StoryId } from "../../domain/value-objects/story-id.js";
import { StoryIdAnnotation } from "../../domain/value-objects/story-id-annotation.js";
import type { WorkItemFrontmatter } from "../../domain/value-objects/work-item-frontmatter.js";
import { parseFrontmatterFlags } from "../parsers/frontmatter-flag-parser.js";
import { parseStoryAnnotations } from "../parsers/markdown-story-annotation-parser.js";
import { parseWorkItemFrontmatter } from "../parsers/work-item-frontmatter-parser.js";

export interface MarkdownDesignDocumentGatewayDeps {
  readonly rootDir: string;
  readonly designDocsRoot?: string;
}

export class MarkdownDesignDocumentGateway implements DesignDocumentPort {
  private readonly rootDir: string;
  private readonly designDocsRoot: string;
  private readonly contentCache = new Map<string, string>();

  constructor(deps: MarkdownDesignDocumentGatewayDeps) {
    this.rootDir = deps.rootDir;
    this.designDocsRoot = deps.designDocsRoot ?? path.join("docs", "product", "construction");
  }

  async listByUnit(unitName: string): Promise<readonly ProjectRelativePathLike[]> {
    const constructionRoot = path.posix.join(this.designDocsRoot, unitName);
    const constructionDir = path.join(this.rootDir, constructionRoot);

    if (!fs.existsSync(constructionDir)) {
      return [];
    }

    const entries = await readdir(constructionDir);
    const results: ProjectRelativePathLike[] = [];

    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        results.push(ProjectRelativePath.create(path.posix.join(constructionRoot, entry)));
      }
    }

    return results;
  }

  async findConstructionDocuments(unitName: string): Promise<readonly ProjectRelativePathLike[]> {
    return this.listByUnit(unitName);
  }

  async readStoryAnnotations(filePath: ProjectRelativePathLike): Promise<readonly StoryIdAnnotation[]> {
    const content = await this.getContent(filePath);
    const parsed = parseStoryAnnotations(content);

    const annotations: StoryIdAnnotation[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      try {
        const storyId = StoryId.parse(p.storyIdValue);
        annotations.push(
          StoryIdAnnotation.create({
            storyId,
            lineNumber: p.lineNumber,
            contextLine: p.contextLine,
            standaloneLine: p.standaloneLine,
          }),
        );
      } catch {
        // StoryId形式が不正な場合はスキップする
      }
    }

    return annotations;
  }

  async readStoryIdAnnotations(filePath: ProjectRelativePathLike): Promise<readonly StoryIdAnnotation[]> {
    return this.readStoryAnnotations(filePath);
  }

  async readFrontmatterFlags(filePath: ProjectRelativePathLike): Promise<DesignDocumentFlags> {
    const content = await this.getContent(filePath);
    const parsed = parseFrontmatterFlags(content);
    return DesignDocumentFlags.create(parsed.initialCreation);
  }

  async readWorkItemFrontmatter(filePath: ProjectRelativePathLike): Promise<WorkItemFrontmatter | null> {
    const content = await this.getContent(filePath);
    return parseWorkItemFrontmatter(content);
  }

  private async getContent(filePath: ProjectRelativePathLike): Promise<string> {
    const cached = this.contentCache.get(filePath.value);
    if (cached !== undefined) {
      return cached;
    }

    const absolutePath = path.join(this.rootDir, filePath.value);
    const content = await readFile(absolutePath, "utf8");
    this.contentCache.set(filePath.value, content);
    return content;
  }
}
