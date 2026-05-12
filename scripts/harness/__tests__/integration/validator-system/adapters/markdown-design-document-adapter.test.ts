/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-117, WI-118
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
      it('product construction docsから構造化ドキュメントを返す (IT-REPO-DesignDoc-001)', async () => {
        // Arrange
        const adapter = new MarkdownDesignDocumentAdapter('docs/product/construction');

        // Act
        const actual = await adapter.loadDesignDocuments(['harness-error']);

        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
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

      it('product docs の layer / unit / ADR annotation を typed target として返す (IT-REPO-DesignDoc-013)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi118-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          const docPath = path.join(unitDir, 'logical_design.md');
          await writeFile(
            docPath,
            [
              '<!-- @unit wrong-unit -->',
              '<!-- @layer invalid-layer -->',
              'ADR-999',
              '',
            ].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);
          // Act
          const actual = await adapter.getLayerAnnotations([docPath]);
          // Assert
          expect(actual[`${docPath}#unit:wrong-unit`]).toBe('unit:mismatch:test-unit');
          expect(actual[`${docPath}#layer:invalid-layer`]).toBe('layer:unknown');
          expect(actual['ADR-999']).toBe('adr:referenced');
        } finally {
          await rm(root, { recursive: true, force: true });
        }
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

  describe('括弧 qualifier の normalize (WI-091 finding #5)', () => {
    context('全角括弧 `（〜）` の qualifier 付き見出しを含む場合', () => {
      it('qualifier が除去された名前が concepts に含まれること (IT-REPO-DesignDoc-007)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi091-fullwidth-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            [
              '## CommonIdInfo（エンティティ・新規）',
              '',
              '## Consent（既存・enum 値追加）',
              '',
            ].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);

          // Act
          const actual = await adapter.getElements(['test-unit']);

          // Assert
          expect(actual).toEqual(['CommonIdInfo', 'Consent']);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });

    context('半角括弧 `(〜)` の qualifier 付き見出しを含む場合', () => {
      it('qualifier が除去された名前が concepts に含まれること (IT-REPO-DesignDoc-008)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi091-halfwidth-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            ['## OldClass (legacy)', '', '## NewClass (planned)', ''].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);

          // Act
          const actual = await adapter.getElements(['test-unit']);

          // Assert
          expect(actual).toEqual(['OldClass', 'NewClass']);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });

    context('連続する複数 qualifier `Foo（A）（B）` を含む場合', () => {
      it('全 qualifier が除去された名前が concepts に含まれること (IT-REPO-DesignDoc-009)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi091-multi-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            ['## Foo（A）（B）', '', '## Bar (x)（y）', ''].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);

          // Act
          const actual = await adapter.getElements(['test-unit']);

          // Assert
          expect(actual).toEqual(['Foo', 'Bar']);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });

    context('qualifier のみで本体名が無い見出しを含む場合', () => {
      it('strip 後 0 文字になる見出しは concepts に含まれないこと (IT-REPO-DesignDoc-010)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi091-empty-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            ['## ValidName', '', '## （メタ情報）', '', '## AnotherName', ''].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);

          // Act
          const actual = await adapter.getElements(['test-unit']);

          // Assert
          expect(actual).toEqual(['ValidName', 'AnotherName']);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });
  });

  describe('pointers block 抽出 (WI-095)', () => {
    context('HTML comment形式のpointersを含む場合', () => {
      it('設計要素ごとのpointer一覧が返ること (IT-REPO-DesignDoc-011)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi095-comment-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            [
              '## UserProfile',
              '<!-- pointers: scripts/harness/test-unit/domain/user-profile.ts -->',
              '',
              '## AccountProfile',
              '<!-- pointers: scripts/harness/test-unit/domain/account-profile.ts, scripts/harness/test-unit/domain/account-profile-types.ts -->',
              '',
            ].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);

          // Act
          const actual = await adapter.getElementPointers(['test-unit']);

          // Assert
          expect(actual.UserProfile).toEqual(['scripts/harness/test-unit/domain/user-profile.ts']);
          expect(actual.AccountProfile).toEqual([
            'scripts/harness/test-unit/domain/account-profile.ts',
            'scripts/harness/test-unit/domain/account-profile-types.ts',
          ]);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });

    context('<pointers> block形式のpointersを含む場合', () => {
      it('設計要素ごとの複数pointerが返ること (IT-REPO-DesignDoc-012)', async () => {
        // Arrange
        const root = await mkdtemp(path.join(tmpdir(), 'phasegate-wi095-block-'));
        try {
          const unitDir = path.join(root, 'test-unit');
          await mkdir(unitDir, { recursive: true });
          await writeFile(
            path.join(unitDir, 'domain_model.md'),
            [
              '## UserProfile',
              '<pointers>',
              '  - scripts/harness/test-unit/domain/user-profile.ts',
              '  - scripts/harness/test-unit/domain/user-profile-types.ts',
              '</pointers>',
              '',
              '## Unrelated',
              '',
            ].join('\n'),
            'utf-8',
          );
          const adapter = new MarkdownDesignDocumentAdapter(root);

          // Act
          const actual = await adapter.getElementPointers(['test-unit']);

          // Assert
          expect(actual.UserProfile).toEqual([
            'scripts/harness/test-unit/domain/user-profile.ts',
            'scripts/harness/test-unit/domain/user-profile-types.ts',
          ]);
          expect(actual.Unrelated).toBeUndefined();
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      });
    });
  });
});
