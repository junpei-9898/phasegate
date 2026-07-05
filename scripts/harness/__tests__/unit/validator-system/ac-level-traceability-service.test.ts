/**
 * @layer test
 * @unit validator-system
 * @story HF2-05
 * @work-item-id WI-222
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  AcLevelTraceabilityService,
  type AcLevelTraceabilitySnapshot,
} from '../../../validator-system/domain/services/l4/ac-level-traceability-service.js';

const createSnapshot = (overrides: Partial<AcLevelTraceabilitySnapshot> = {}): AcLevelTraceabilitySnapshot => ({
  acLevelCoverage: { total: 2, acBound: 2, fileFallbackOnly: 0 },
  fileFallbackOnlyAcs: [],
  orphanAcTags: [],
  ...overrides,
});

target('AcLevelTraceabilityService', () => {
  describe('check', () => {
    context('全 AC が ac-bound の場合', () => {
      it('全ac-boundならPASS（findingなし）になること', () => {
        // Arrange
        const sut = new AcLevelTraceabilityService();

        // Act
        const actual = sut.check(createSnapshot());

        // Assert
        expect(actual.hasFindings()).toBe(false);
        expect(actual.toHarnessErrors()).toEqual([]);
      });
    });

    context('fileFallbackOnly な AC が存在する場合', () => {
      it('fileFallbackOnlyにwarning severityのfindingを出しerrorは出さないこと', () => {
        // Arrange
        const sut = new AcLevelTraceabilityService();

        // Act
        const actual = sut.check(createSnapshot({
          acLevelCoverage: { total: 2, acBound: 1, fileFallbackOnly: 1 },
          fileFallbackOnlyAcs: [{ storyId: 'H05-02', acId: 'AC-1' }],
        }));

        // Assert
        expect(actual.hasFindings()).toBe(true);
        const errors = actual.toHarnessErrors();
        expect(errors.every((e) => e.severity.value === 'warning')).toBe(true);
        expect(errors.some((e) => e.severity.value === 'error')).toBe(false);
        expect(errors[0].code.value).toBe('L4-007');
      });
    });

    context('orphanAcTags が存在する場合', () => {
      it('orphanAcTagsをadvisory warningとして報告すること', () => {
        // Arrange
        const sut = new AcLevelTraceabilityService();

        // Act
        const actual = sut.check(createSnapshot({
          orphanAcTags: [{ storyId: 'H07-01', filePath: 'a.test.ts', rawTag: 'H99-99-1', reason: 'ac-not-in-story' }],
        }));

        // Assert
        expect(actual.hasFindings()).toBe(true);
        const errors = actual.toHarnessErrors();
        expect(errors.every((e) => e.severity.value === 'warning')).toBe(true);
        expect(errors.some((e) => e.message.includes('H99-99-1'))).toBe(true);
      });
    });
  });
});
