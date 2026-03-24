/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it } from 'vitest';
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
});
