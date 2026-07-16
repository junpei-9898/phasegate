// @layer test
// @unit phase-dependency-model
// @story H02-03
// @work-item-id WI-276
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  AuditLogWriteError,
  RecordPhaseOverrideAuditUseCase,
} from '../../../phase-dependency-model/application/usecases/record-phase-override-audit-usecase.js';
import type { PhaseAuditLoggerPort } from '../../../phase-dependency-model/domain/ports/phase-audit-logger-port.js';

target('RecordPhaseOverrideAuditUseCase', () => {
  describe('execute', () => {
    context('override監査を記録する場合', () => {
      it('generatedAtを補って監査ログへ転送すること', async () => {
        // Arrange
        const auditLogger: PhaseAuditLoggerPort = {
          record: vi.fn(),
        };
        const sut = new RecordPhaseOverrideAuditUseCase({
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          scope: {
            unitId: 'phase-dependency-model',
            storyId: 'H02-01',
          },
          targetLevel: 3,
          appliedRules: ['1:unit-designer->2:unit-test-logic-designer'],
          requestedOverride: true,
        });

        // Assert
        expect(actual).toBeUndefined();
        expect(auditLogger.record).toHaveBeenCalledWith({
          scope: {
            unitId: 'phase-dependency-model',
            storyId: 'H02-01',
          },
          targetLevel: 3,
          appliedRules: ['1:unit-designer->2:unit-test-logic-designer'],
          generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          requestedOverride: true,
        });
      });
    });

    context('監査ログ書き込みに失敗する場合', () => {
      it('AuditLogWriteErrorとして送出すること', async () => {
        // Arrange
        const auditLogger: PhaseAuditLoggerPort = {
          record: vi.fn().mockRejectedValue(new Error('disk full')),
        };
        const sut = new RecordPhaseOverrideAuditUseCase({
          auditLogger,
        });

        // Act
        const actual = sut.execute({
          scope: {
            unitId: 'phase-dependency-model',
          },
          targetLevel: 2,
          appliedRules: ['1:unit-designer->2:unit-test-logic-designer'],
          requestedOverride: true,
        });

        // Assert
        await expect(actual).rejects.toThrowError(AuditLogWriteError);
      });
    });
  });
});
