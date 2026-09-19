// @story H01-01
// @unit biome-ast-engine
// @layer test
// @work-item-id WI-220
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as ts from 'typescript';
import { TypeScriptSourceModuleAnalyzerAdapter } from '../../../biome-ast-engine/infrastructure/adapters/typescript-source-module-analyzer-adapter.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { NodeWorkspaceFileAdapter } from '../../../biome-ast-engine/infrastructure/adapters/node-workspace-file-adapter.js';

const compilerMode = vi.hoisted(() => ({ legacy: false }));
vi.mock('typescript', async () => {
  const actual = await vi.importActual<typeof import('typescript')>('typescript');
  return {
    ...actual,
    createProgram: (roots: string[], options: ts.CompilerOptions) => actual.createProgram(roots,
      compilerMode.legacy ? { ...options, noLib: false, noResolve: false } : options),
  };
});

const temporaryRoots: string[] = [];
function fixture(files: Record<string, string>) {
  const rootDir = mkdtempSync(join(tmpdir(), 'phasegate-syntax-compat-'));
  temporaryRoots.push(rootDir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(rootDir, name)), { recursive: true });
    writeFileSync(join(rootDir, name), content);
  }
  return { rootDir, adapter: new TypeScriptSourceModuleAnalyzerAdapter({ rootDir }) };
}
const filePaths = (names: string[]) => names.map(FilePath.fromWorkspaceRelative);
afterEach(() => {
  compilerMode.legacy = false;
  vi.restoreAllMocks();
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('構文抽出の互換性と不要読込', () => {
  it('実repository全体でも解析対象を減らさず従来と同じ構文情報を返すこと', async () => {
    // Arrange: production workspace enumeration and real compiler in both modes.
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
    const paths = await new NodeWorkspaceFileAdapter({ rootDir }).listSourceFiles();
    const adapter = new TypeScriptSourceModuleAnalyzerAdapter({ rootDir });
    compilerMode.legacy = true;
    const reference = await adapter.analyzeMany(paths);
    compilerMode.legacy = false;

    // Act
    const actual = await adapter.analyzeMany(paths);

    // Assert: compare every field, not only counts or a zero-violation report.
    expect(paths.some((p) => p.toString() === 'scripts/harness/main.ts')).toBe(true);
    expect(actual.map((s) => s.filePath.toString())).toEqual(paths.map((p) => p.toString()));
    expect(actual).toEqual(reference);
  }, 60000);

  it('標準libraryと未列挙依存を読まず相対importのedgeと指定ファイルのmetadataを保つこと', async () => {
    const { rootDir, adapter } = fixture({
      'src/domain/a.ts': '// @unit sample\n// @layer domain\nimport { b } from "./b.js";\nexport const a: number = b;\n',
      'src/domain/b.ts': 'export const b = 1;\n',
    });
    const reads: string[] = [];
    const read = ts.sys.readFile;
    vi.spyOn(ts.sys, 'readFile').mockImplementation((name, encoding) => {
      reads.push(resolve(name));
      return read(name, encoding);
    });

    const actual = await adapter.analyzeMany(filePaths(['src/domain/a.ts']));

    expect(actual.map((s) => s.filePath.toString())).toEqual(['src/domain/a.ts']);
    expect(actual[0].declaredUnit).toBe('sample');
    expect(actual[0].declaredLayer?.toString()).toBe('domain');
    expect(actual[0].imports.map((edge) => ({ to: edge.to.toString(), kind: edge.importKind })))
      .toEqual([{ to: 'src/domain/b.ts', kind: 'value' }]);
    expect(reads).not.toContain(resolve(rootDir, 'src/domain/b.ts'));
    expect(reads.filter((name) => /[/\\]lib(?:\.[^/\\]+)?\.d\.ts$/.test(name))).toEqual([]);
  });

  it('異なる構文・拡張子・改行でも従来compilerと同じ全snapshotを返すこと', async () => {
    const files = {
      'src/domain/index.ts': '\uFEFF// @unit sample\r\n// @layer domain\r\nimport type { Shape } from "./types.js";\r\nexport { value } from "./value.js";\r\nexport interface Model { x: any; label: string; }\r\nexport async function run(x: Shape): Promise<any> { return import("./value.js"); }\r\n',
      'src/domain/types.d.ts': '// @layer domain\nexport interface Shape { id: number; }\n',
      'src/domain/value.ts': '// @layer domain\nexport const value: any = 1;\n',
      'src/domain/view.tsx': '// @layer domain\nexport const view = <div>{1}</div>;\n',
      'src/domain/module.mts': '// @layer domain\nexport type Value = boolean | string;\n',
      'src/domain/common.cts': '// @layer domain\nexport class Service { run(): void {} }\n',
      'src/domain/unsupported.js': 'export const excluded = 1;\n',
    };
    const { adapter } = fixture(files);
    const paths = filePaths([...Object.keys(files), 'src/domain/missing.ts']);
    compilerMode.legacy = true;
    const reference = await adapter.analyzeMany(paths);
    compilerMode.legacy = false;

    const actual = await adapter.analyzeMany(paths);

    expect(actual).toEqual(reference);
    expect(actual.map((s) => s.filePath.toString())).toEqual(Object.keys(files).filter((name) => !name.endsWith('.js')));
    expect(actual[0].isEntrypointCandidate).toBe(true);
    expect(actual[0].anyTypeCount).toBe(2);
    expect(actual[0].exportedSymbols).toEqual(['Model', 'run']);
    expect(actual[0].imports.map((edge) => edge.importKind)).toEqual(['type', 'value', 'dynamic']);
  });

  it('全workspaceファイルを指定した解析では依存先のsnapshotも省略しないこと', async () => {
    const { adapter } = fixture({
      'src/domain/a.ts': '// @layer domain\nexport { b } from "./b.js";\n',
      'src/domain/b.ts': '// @layer domain\nexport const b: any = 1;\n',
    });

    const actual = await adapter.analyzeMany(filePaths(['src/domain/a.ts', 'src/domain/b.ts']));

    expect(actual.map((s) => s.filePath.toString())).toEqual(['src/domain/a.ts', 'src/domain/b.ts']);
    expect(actual[0].imports[0].to.toString()).toBe('src/domain/b.ts');
    expect(actual[1].anyTypeCount).toBe(1);
    expect(actual[1].exportedSymbols).toEqual(['b']);
  });
});
