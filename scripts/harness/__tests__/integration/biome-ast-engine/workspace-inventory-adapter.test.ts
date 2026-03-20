/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { WorkspaceInventoryAdapter } from '../../../biome-ast-engine/infrastructure/adapters/workspace-inventory-adapter.js';

let tmpDirs: string[] = [];

const createTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-inventory-'));
  tmpDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

target('WorkspaceInventoryAdapter', () => {
  describe('findLegacyEslintArtifacts', () => {
    context('.eslintrcファイルが存在する場合', () => {
      it('.eslintrcファイルが検出される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        fs.writeFileSync(path.join(rootDir, '.eslintrc'), '{}');
        fs.writeFileSync(path.join(rootDir, '.eslintrc.json'), '{}');
        const adapter = new WorkspaceInventoryAdapter({ rootDir });

        // Act
        const actual = await adapter.findLegacyEslintArtifacts();

        // Assert
        expect(actual.configFiles).toContain('.eslintrc');
        expect(actual.configFiles).toContain('.eslintrc.json');
      });
    });

    context('eslint.config.jsが存在する場合', () => {
      it('eslint.config.jsが検出される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        fs.writeFileSync(path.join(rootDir, 'eslint.config.js'), 'module.exports = {};');
        const adapter = new WorkspaceInventoryAdapter({ rootDir });

        // Act
        const actual = await adapter.findLegacyEslintArtifacts();

        // Assert
        expect(actual.configFiles).toContain('eslint.config.js');
      });
    });

    context('package.jsonにESLint依存がある場合', () => {
      it('ESLint依存がpackage.jsonから検出される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const pkg = {
          devDependencies: {
            'eslint': '^8.0.0',
            '@typescript-eslint/parser': '^6.0.0',
            'eslint-plugin-import': '^2.0.0',
            'prettier': '^3.0.0',
          },
        };
        fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify(pkg, null, 2));
        const adapter = new WorkspaceInventoryAdapter({ rootDir });

        // Act
        const actual = await adapter.findLegacyEslintArtifacts();

        // Assert
        expect(actual.packageDependencies).toContain('eslint');
        expect(actual.packageDependencies).toContain('@typescript-eslint/parser');
        expect(actual.packageDependencies).toContain('eslint-plugin-import');
        expect(actual.packageDependencies).not.toContain('prettier');
      });
    });

    context('ESLint関連ファイルがない場合', () => {
      it('ESLint関連ファイルがない場合は空結果', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const adapter = new WorkspaceInventoryAdapter({ rootDir });

        // Act
        const actual = await adapter.findLegacyEslintArtifacts();

        // Assert
        expect(actual.configFiles).toEqual([]);
        expect(actual.packageDependencies).toEqual([]);
      });
    });
  });
});
