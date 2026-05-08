/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * docs/product/units/ 配下の *_unit.md を走査し UnitDefinitionPort を実装するゲートウェイ
 */
import { readFile, readdir } from 'node:fs/promises';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UnitDefinitionPort } from '../../domain/ports/unit-definition-port.js';
import type { ProjectRelativePathLike } from '../../domain/value-objects/chain-link.js';
import { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

const UNIT_ID_PATTERN = /Unit\s+ID\*{0,2}\s*[:：]\s*(\S+)/;

export interface MarkdownUnitDefinitionGatewayDeps {
  readonly rootDir: string;
  readonly productDocsRoot?: string;
  readonly designDocsRoot?: string;
}

export class MarkdownUnitDefinitionGateway implements UnitDefinitionPort {
  private readonly rootDir: string;
  private readonly productDocsRoot: string;
  private readonly designDocsRoot: string;
  private cachedUnitNames: readonly string[] | null = null;

  constructor(deps: MarkdownUnitDefinitionGatewayDeps) {
    this.rootDir = deps.rootDir;
    this.productDocsRoot = deps.productDocsRoot ?? path.join('docs', 'product');
    this.designDocsRoot = deps.designDocsRoot ?? path.join('docs', 'product', 'construction');
  }

  async getAllUnitNames(): Promise<readonly string[]> {
    await this.ensureLoaded();
    return this.cachedUnitNames!;
  }

  async exists(unitName: string): Promise<boolean> {
    const names = await this.getAllUnitNames();
    return names.indexOf(unitName) >= 0;
  }

  async hasUnit(unitName: string): Promise<boolean> {
    return this.exists(unitName);
  }

  async findConstructionRoot(
    unitName: string,
  ): Promise<ProjectRelativePathLike | null> {
    const unitExists = await this.exists(unitName);
    if (!unitExists) {
      return null;
    }

    const constructionPath = path.posix.join(this.designDocsRoot, unitName);
    const absolutePath = path.join(this.rootDir, constructionPath);

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    return ProjectRelativePath.create(constructionPath);
  }

  async resolveConstructionRoot(
    unitName: string,
  ): Promise<ProjectRelativePathLike | null> {
    return this.findConstructionRoot(unitName);
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cachedUnitNames !== null) {
      return;
    }

    const unitsDir = path.join(this.rootDir, this.productDocsRoot, 'units');
    if (!fs.existsSync(unitsDir)) {
      this.cachedUnitNames = Object.freeze([]);
      return;
    }

    const entries = await readdir(unitsDir);
    const unitNames: string[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('_unit.md')) {
        continue;
      }

      const filePath = path.join(unitsDir, entry);
      const content = await readFile(filePath, 'utf8');
      const match = UNIT_ID_PATTERN.exec(content);
      if (match) {
        unitNames.push(match[1].trim());
      }
    }

    this.cachedUnitNames = Object.freeze(unitNames);
  }
}
