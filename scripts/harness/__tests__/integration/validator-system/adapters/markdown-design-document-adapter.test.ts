/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../../helpers/test-helpers.js';
import { MarkdownDesignDocumentAdapter } from '../../../../validator-system/infrastructure/adapters/markdown-design-document-adapter.js';

target('MarkdownDesignDocumentAdapter', () => {
  describe('loadDesignDocuments', () => {
    context('存在するUnitを指定した場合', () => {
      it('domain_model.mdから構造化ドキュメントを返す (IT-REPO-DesignDoc-001)', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter('docs/product/construction');

        // Act
        const actual = await adapter.loadDesignDocuments(['harness-error']);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]?.unitName).toBe('harness-error');
        expect(actual[0]?.concepts.length).toBeGreaterThan(0);
      });
    });

    context('存在しないUnitを指定した場合', () => {
      it('空配列が返る (IT-REPO-DesignDoc-002)', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter('docs/product/construction');

        // Act
        const actual = await adapter.loadDesignDocuments(['nonexistent-unit']);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('getLayerAnnotationsを呼んだ場合', () => {
      it('空オブジェクトが返る (IT-REPO-DesignDoc-003)', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter('docs/product/construction');

        // Act
        const actual = await adapter.getLayerAnnotations(['src/foo.ts']);

        // Assert
        expect(typeof actual).toBe('object');
      });
    });

    context('getElementsを呼んだ場合', () => {
      it('設計ドキュメントから抽出した要素名一覧が返る (IT-REPO-DesignDoc-004)', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter('docs/product/construction');

        // Act
        const actual = await adapter.getElements(['harness-error']);

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual).toContain('1. Ownership / Import-Export');
      });
    });
  });

  describe('メタ見出しスキップ (ISSUE-005 P3-8)', () => {
    context('<!-- @drift-check: skip --> マーカー付きの見出しを含む場合', () => {
      it('マーカー付き見出しは concepts から除外される (IT-REPO-DesignDoc-005)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-p3-8-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            [
              '## UserAggregate',
              '',
              '## engineering-perspective 自己評価',
              '<!-- @drift-check: skip -->',
              '',
              '## OrderAggregate',
              '',
              '## Discussion <!-- @drift-check: skip -->',
              '',
            ].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);
          // Act
          const actual = await adapter.getElements(['test-unit']);
          // Assert
          expect(actual).toContain('UserAggregate');
          expect(actual).toContain('OrderAggregate');
          expect(actual).not.toContain('Discussion');
          // engineering-perspective は既知メタパターンでも除外される
          expect(actual.some((n) => n.includes('engineering-perspective'))).toBe(false);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });

    context('既知のメタ見出しパターン (自己評価 / TODO 等) を含む場合', () => {
      it('マーカーなしでも暗黙的にスキップされる (IT-REPO-DesignDoc-006)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-p3-8-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            [
              '## MainEntity',
              '',
              '## TODO',
              '',
              '## 変更履歴',
              '',
              '## 参考文献',
              '',
              '## ValueObject',
              '',
            ].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);
          // Act
          const actual = await adapter.getElements(['test-unit']);
          // Assert
          expect(actual).toEqual(['MainEntity', 'ValueObject']);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });
  });
});
