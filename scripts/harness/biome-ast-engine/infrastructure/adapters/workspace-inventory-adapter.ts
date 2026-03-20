/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { WorkspaceInventoryPort } from '../../domain/ports/workspace-inventory-port.js';

const ESLINT_CONFIG_PATTERNS = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.cjs',
  'eslint.config.mjs',
  'eslint.config.ts',
];

const ESLINT_DEP_PREFIXES = ['eslint', '@typescript-eslint/', 'eslint-plugin-', 'eslint-config-'];

export interface WorkspaceInventoryAdapterDeps {
  readonly rootDir: string;
}

/**
 * WorkspaceInventoryPort の実装。
 * ワークスペースルートで .eslintrc*, eslint.config.* の存在をチェックし、
 * package.json 内の ESLint 関連依存を検出する。
 */
export class WorkspaceInventoryAdapter implements WorkspaceInventoryPort {
  private readonly rootDir: string;

  constructor(deps: WorkspaceInventoryAdapterDeps) {
    this.rootDir = deps.rootDir;
  }

  async findLegacyEslintArtifacts(): Promise<{
    configFiles: readonly string[];
    packageDependencies: readonly string[];
  }> {
    const configFiles = this.findConfigFiles();
    const packageDependencies = await this.findEslintDependencies();

    return {
      configFiles: Object.freeze(configFiles),
      packageDependencies: Object.freeze(packageDependencies),
    };
  }

  private findConfigFiles(): string[] {
    const found: string[] = [];

    for (const pattern of ESLINT_CONFIG_PATTERNS) {
      const fullPath = path.join(this.rootDir, pattern);

      if (fs.existsSync(fullPath)) {
        found.push(pattern);
      }
    }

    return found;
  }

  private async findEslintDependencies(): Promise<string[]> {
    const pkgPath = path.join(this.rootDir, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      return [];
    }

    const content = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(content) as Record<string, unknown>;
    const deps = new Set<string>();

    const sections = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

    for (const section of sections) {
      const sectionObj = pkg[section];

      if (typeof sectionObj !== 'object' || sectionObj === null) {
        continue;
      }

      for (const depName of Object.keys(sectionObj as Record<string, unknown>)) {
        if (ESLINT_DEP_PREFIXES.some((prefix) => depName.startsWith(prefix))) {
          deps.add(depName);
        }
      }
    }

    return Array.from(deps).sort();
  }
}
