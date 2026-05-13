/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-156
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { SkillCatalogDriftService, type SkillCatalogSnapshot } from '../../../validator-system/domain/services/l4/skill-catalog-drift-service.js';

const createSnapshot = (overrides: Partial<SkillCatalogSnapshot> = {}): SkillCatalogSnapshot => ({
  actualSkillNames: ['alpha', 'beta', 'gamma'],
  countDeclarations: [
    { sourcePath: 'skills/README.md', declaredCount: 3, line: 3 },
    { sourcePath: 'docs/guide/skills-overview.md', declaredCount: 3, line: 3 },
  ],
  categoryDeclarations: [
    { sourcePath: 'docs/guide/skills-overview.md', categoryName: 'Foundation', declaredCount: 1, line: 10 },
    { sourcePath: 'docs/guide/skills-overview.md', categoryName: 'Design', declaredCount: 2, line: 20 },
  ],
  ...overrides,
});

target('SkillCatalogDriftService', () => {
  describe('check', () => {
    context('ドキュメント上の件数が実際のskill catalogと一致する場合', () => {
      it('findingなしのレポートを返すこと', () => {
        // Arrange
        const sut = new SkillCatalogDriftService();

        // Act
        const actual = sut.check(createSnapshot());

        // Assert
        expect(actual.hasFindings()).toBe(false);
        expect(actual.findings).toEqual([]);
      });
    });

    context('ドキュメント上の合計件数が実際のcatalogと異なる場合', () => {
      it('skill-count-mismatch findingを返すこと', () => {
        // Arrange
        const sut = new SkillCatalogDriftService();

        // Act
        const actual = sut.check(createSnapshot({
          countDeclarations: [{ sourcePath: 'README.md', declaredCount: 2, line: 42 }],
        }));

        // Assert
        expect(actual.findings).toEqual([
          expect.objectContaining({
            kind: 'skill-count-mismatch',
            sourcePath: 'README.md',
            expectedCount: 3,
            actualCount: 2,
            line: 42,
          }),
        ]);
      });
    });

    context('skills overviewのカテゴリ合計が実際のcatalogと異なる場合', () => {
      it('skill-category-total-mismatch findingを返すこと', () => {
        // Arrange
        const sut = new SkillCatalogDriftService();

        // Act
        const actual = sut.check(createSnapshot({
          categoryDeclarations: [
            { sourcePath: 'docs/guide/skills-overview.md', categoryName: 'Foundation', declaredCount: 1, line: 10 },
            { sourcePath: 'docs/guide/skills-overview.md', categoryName: 'Design', declaredCount: 1, line: 20 },
          ],
        }));

        // Assert
        expect(actual.findings).toEqual([
          expect.objectContaining({
            kind: 'skill-category-total-mismatch',
            sourcePath: 'docs/guide/skills-overview.md',
            expectedCount: 3,
            actualCount: 2,
          }),
        ]);
      });
    });

    context('findingをL4-006 harness errorへ変換する場合', () => {
      it('warning severityとremediation fieldを保持すること', () => {
        // Arrange
        const sut = new SkillCatalogDriftService();
        const report = sut.check(createSnapshot({
          countDeclarations: [{ sourcePath: 'README.md', declaredCount: 2, line: 42 }],
        }));

        // Act
        const actual = report.toHarnessErrors();

        // Assert
        expect(actual).toEqual([
          expect.objectContaining({
            code: expect.objectContaining({ value: 'L4-006' }),
            severity: expect.objectContaining({ value: 'warning' }),
            kind: 'skill-count-mismatch',
            sourcePath: 'README.md',
            expectedCount: 3,
            actualCount: 2,
            line: 42,
          }),
        ]);
      });
    });
  });
});
