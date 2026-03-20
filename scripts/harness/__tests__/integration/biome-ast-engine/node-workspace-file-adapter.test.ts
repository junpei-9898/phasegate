/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { NodeWorkspaceFileAdapter } from '../../../biome-ast-engine/infrastructure/adapters/node-workspace-file-adapter.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';

let tmpDirs: string[] = [];

const createTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-ws-file-'));
  tmpDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

target('NodeWorkspaceFileAdapter', () => {
  describe('listSourceFiles', () => {
    context('対象ディレクトリに.tsファイルがある場合', () => {
      it('.tsファイルがリストアップされる', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const srcDir = path.join(rootDir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const a = 1;');
        fs.writeFileSync(path.join(srcDir, 'util.tsx'), 'export const b = 2;');
        fs.writeFileSync(path.join(srcDir, 'readme.md'), '# readme');
        const adapter = new NodeWorkspaceFileAdapter({ rootDir });

        // Act
        const actual = await adapter.listSourceFiles(['src']);

        // Assert
        const fileNames = actual.map((fp) => fp.fileName());
        expect(fileNames).toContain('index.ts');
        expect(fileNames).toContain('util.tsx');
        expect(fileNames).not.toContain('readme.md');
      });
    });

    context('node_modulesが存在する場合', () => {
      it('node_modulesが除外される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const srcDir = path.join(rootDir, 'src');
        const nodeModulesDir = path.join(srcDir, 'node_modules', 'pkg');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'app.ts'), 'export const x = 1;');
        fs.writeFileSync(path.join(nodeModulesDir, 'lib.ts'), 'export const y = 2;');
        const adapter = new NodeWorkspaceFileAdapter({ rootDir });

        // Act
        const actual = await adapter.listSourceFiles(['src']);

        // Assert
        const fileNames = actual.map((fp) => fp.fileName());
        expect(fileNames).toContain('app.ts');
        expect(fileNames).not.toContain('lib.ts');
      });
    });

    context('存在しないディレクトリを指定した場合', () => {
      it('存在しないディレクトリで空配列を返す', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const adapter = new NodeWorkspaceFileAdapter({ rootDir });

        // Act
        const actual = await adapter.listSourceFiles(['nonexistent']);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  describe('readText', () => {
    context('ファイルが存在する場合', () => {
      it('ファイル内容を読み取れる', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const srcDir = path.join(rootDir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const content = 'export const hello = "world";';
        fs.writeFileSync(path.join(srcDir, 'sample.ts'), content);
        const adapter = new NodeWorkspaceFileAdapter({ rootDir });
        const filePath = FilePath.fromWorkspaceRelative('src/sample.ts');

        // Act
        const actual = await adapter.readText(filePath);

        // Assert
        expect(actual).toBe(content);
      });
    });
  });
});
