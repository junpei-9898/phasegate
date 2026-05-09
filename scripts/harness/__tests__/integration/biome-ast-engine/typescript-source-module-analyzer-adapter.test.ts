// @unit biome-ast-engine
// @layer infrastructure
// @story H01-01

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { TypeScriptSourceModuleAnalyzerAdapter } from '../../../biome-ast-engine/infrastructure/adapters/typescript-source-module-analyzer-adapter.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { freezeArchitectureSpec } from '../../../biome-ast-engine/domain/value-objects/architecture-spec.js';

let tmpDirs: string[] = [];

const createTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-analyzer-'));
  tmpDirs.push(dir);
  return dir;
};

const writeFile = (rootDir: string, relPath: string, content: string): void => {
  const absPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
};

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

target('TypeScriptSourceModuleAnalyzerAdapter.analyzeMany (metadataTags)', () => {
  describe('設定されたmetadata tag名でunit/layerを抽出する', () => {
    context('@module / @tier を指定した場合', () => {
      it('@unit / @layer ではなく設定タグだけが抽出される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(
          rootDir,
          'src/domain/example.ts',
          '// @unit legacy\n// @layer infrastructure\n// @module custom-unit\n// @tier domain\nexport const x = 1;\n'
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });
        const architecture = freezeArchitectureSpec({
          layers: ['domain', 'application', 'infrastructure', 'presentation'],
          allowedDependencies: {
            domain: ['domain'],
            application: ['application', 'domain'],
            infrastructure: ['infrastructure', 'application', 'domain'],
            presentation: ['presentation', 'application', 'domain'],
          },
          metadataTags: { unit: '@module', layer: '@tier' },
        });

        // Act
        const actual = await adapter.analyzeMany(
          [FilePath.fromWorkspaceRelative('src/domain/example.ts')],
          architecture
        );

        // Assert
        expect(actual[0].declaredUnit).toBe('custom-unit');
        expect(actual[0].declaredLayer?.toString()).toBe('domain');
      });
    });

    context('@module / @tier 設定で旧タグのみがある場合', () => {
      it('unit/layer metadataは欠落として扱われる', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(
          rootDir,
          'src/domain/example.ts',
          '// @unit legacy\n// @layer domain\nexport const x = 1;\n'
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });
        const architecture = freezeArchitectureSpec({
          layers: ['domain', 'application', 'infrastructure', 'presentation'],
          allowedDependencies: {
            domain: ['domain'],
            application: ['application', 'domain'],
            infrastructure: ['infrastructure', 'application', 'domain'],
            presentation: ['presentation', 'application', 'domain'],
          },
          metadataTags: { unit: '@module', layer: '@tier' },
        });

        // Act
        const actual = await adapter.analyzeMany(
          [FilePath.fromWorkspaceRelative('src/domain/example.ts')],
          architecture
        );

        // Assert
        expect(actual[0].declaredUnit).toBeNull();
        expect(actual[0].hasLayerComment()).toBe(false);
      });
    });
  });
});

target('TypeScriptSourceModuleAnalyzerAdapter.analyzeMany (extractImports)', () => {
  describe('export ... from 再エクスポートをedgeとして生成する', () => {
    context('export { X } from "./foo.js" 形式の場合', () => {
      it('value importKind のedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'src/foo.ts', 'export const Foo = 1;\n');
        writeFile(
          rootDir,
          'src/barrel.ts',
          "export { Foo } from './foo.js';\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/barrel.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        expect(edges).toHaveLength(1);
        expect(edges[0].to.toString()).toBe('src/foo.ts');
        expect(edges[0].importKind).toBe('value');
      });
    });

    context('export type { X } from "./foo.js" 形式の場合', () => {
      it('type importKind のedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'src/foo-type.ts', 'export type Foo = number;\n');
        writeFile(
          rootDir,
          'src/barrel.ts',
          "export type { Foo } from './foo-type.js';\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/barrel.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        expect(edges).toHaveLength(1);
        expect(edges[0].to.toString()).toBe('src/foo-type.ts');
        expect(edges[0].importKind).toBe('type');
      });
    });

    context('export * from "./utils.js" 形式の場合', () => {
      it('value importKind のedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'src/utils.ts', 'export const util = () => {};\n');
        writeFile(
          rootDir,
          'src/barrel.ts',
          "export * from './utils.js';\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/barrel.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        expect(edges).toHaveLength(1);
        expect(edges[0].to.toString()).toBe('src/utils.ts');
        expect(edges[0].importKind).toBe('value');
      });
    });

    context('export { X as Y } from "./foo.js" のエイリアス re-export の場合', () => {
      it('value importKind のedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'src/foo.ts', 'export const Foo = 1;\n');
        writeFile(
          rootDir,
          'src/barrel.ts',
          "export { Foo as Bar } from './foo.js';\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/barrel.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        expect(edges).toHaveLength(1);
        expect(edges[0].to.toString()).toBe('src/foo.ts');
        expect(edges[0].importKind).toBe('value');
      });
    });

    context('export { ... } が moduleSpecifier を持たない local re-export の場合', () => {
      it('edgeは生成されない', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(
          rootDir,
          'src/local.ts',
          'const Foo = 1;\nexport { Foo };\n'
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/local.ts'),
        ]);

        // Assert
        expect(actual[0].imports).toEqual([]);
      });
    });
  });

  describe('関数内のdynamic import ( await import(...) ) をedgeとして生成する', () => {
    context('async関数内でdynamic importを使う場合', () => {
      it('dynamic importKind のedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(
          rootDir,
          'src/lazy-target.ts',
          'export const lazy = () => {};\n'
        );
        writeFile(
          rootDir,
          'src/caller.ts',
          "async function runLazy() {\n  const mod = await import('./lazy-target.js');\n  return mod;\n}\nexport { runLazy };\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/caller.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        expect(edges).toHaveLength(1);
        expect(edges[0].to.toString()).toBe('src/lazy-target.ts');
        expect(edges[0].importKind).toBe('dynamic');
      });
    });

    context('クラスメソッド内にdynamic importがネストしている場合', () => {
      it('再帰走査でedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(
          rootDir,
          'src/lazy-target.ts',
          'export const lazy = () => {};\n'
        );
        writeFile(
          rootDir,
          'src/caller.ts',
          "export class Runner {\n  async run() {\n    const mod = await import('./lazy-target.js');\n    return mod;\n  }\n}\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/caller.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        expect(edges.some((e) => e.to.toString() === 'src/lazy-target.ts' && e.importKind === 'dynamic')).toBe(true);
      });
    });
  });

  describe('複合パターン', () => {
    context('通常のimport, 再エクスポート, dynamic importが混在する場合', () => {
      it('それぞれ適切なimportKindでedgeが生成される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'src/a.ts', 'export const a = 1;\n');
        writeFile(rootDir, 'src/b.ts', 'export type B = number;\n');
        writeFile(rootDir, 'src/c.ts', 'export const c = 3;\n');
        writeFile(rootDir, 'src/d.ts', 'export const d = 4;\n');
        writeFile(
          rootDir,
          'src/main.ts',
          "import { a } from './a.js';\n" +
            "import type { B } from './b.js';\n" +
            "export { c } from './c.js';\n" +
            "async function f() { await import('./d.js'); }\n" +
            "export { f };\n"
        );
        const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });

        // Act
        const actual = await adapter.analyzeMany([
          FilePath.fromWorkspaceRelative('src/main.ts'),
        ]);

        // Assert
        const edges = actual[0].imports;
        const findEdge = (target: string) => edges.find((e) => e.to.toString() === target);
        expect(findEdge('src/a.ts')?.importKind).toBe('value');
        expect(findEdge('src/b.ts')?.importKind).toBe('type');
        expect(findEdge('src/c.ts')?.importKind).toBe('value');
        expect(findEdge('src/d.ts')?.importKind).toBe('dynamic');
        expect(edges).toHaveLength(4);
      });
    });
  });
});
