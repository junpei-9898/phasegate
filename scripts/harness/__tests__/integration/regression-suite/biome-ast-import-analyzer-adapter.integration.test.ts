// @unit regression-suite
// @layer infrastructure
// @story H14-02
import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { BiomeAstImportAnalyzerAdapter } from '../../../regression-suite/infrastructure/adapters/biome-ast-import-analyzer-adapter.js';

target('BiomeAstImportAnalyzerAdapter（実ファイル解析）', () => {
  // IT-ADP-ImportAnalyzer-001
  describe('analyzeImports: 実ファイルの import 指定子を一覧で返すこと', () => {
    context('禁止パッケージを含む実 TS ファイルを渡す場合', () => {
      it("import 一覧に '@anthropic-ai/claude-code' と 'node:fs' が含まれること", async () => {
        // Arrange: 実一時ファイルに複数 import を書き込む
        const dir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-import-'));
        const target = path.join(dir, 'module-with-imports.ts');
        try {
          await writeFile(
            target,
            "import { x } from '@anthropic-ai/claude-code';\nimport * as fs from 'node:fs';\nexport const y = x;\n",
            'utf-8',
          );
          const adapter = new BiomeAstImportAnalyzerAdapter();

          // Act
          const actual = await adapter.analyzeImports(target);

          // Assert
          expect(actual).toContain('@anthropic-ai/claude-code');
          expect(actual).toContain('node:fs');
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-ImportAnalyzer-002
  describe('analyzeImports: import を持たない実ファイルに対して空配列を返すこと', () => {
    context('import 文が存在しない実 TS ファイルを渡す場合', () => {
      it('空配列が返ること', async () => {
        // Arrange
        const dir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-noimport-'));
        const target = path.join(dir, 'no-imports.ts');
        try {
          await writeFile(target, 'export const value = 42;\n', 'utf-8');
          const adapter = new BiomeAstImportAnalyzerAdapter();

          // Act
          const actual = await adapter.analyzeImports(target);

          // Assert
          expect(actual).toEqual([]);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-ADP-ImportAnalyzer-003
  describe('analyzeImports: 存在しないファイルに対して空配列でフォールバックすること', () => {
    context('実 FS 上に存在しないファイルパスを渡す場合', () => {
      it('例外を投げず空配列を返すこと', async () => {
        // Arrange
        const missing = path.join(tmpdir(), `phasegate-wi277-missing-module-${Date.now()}.ts`);
        const adapter = new BiomeAstImportAnalyzerAdapter();

        // Act
        const actual = await adapter.analyzeImports(missing);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});
