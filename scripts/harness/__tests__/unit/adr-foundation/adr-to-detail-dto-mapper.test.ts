// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { toAdrDetailDto } from '../../../adr-foundation/application/mappers/adr-to-detail-dto-mapper.js';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';

const createAdr = (
  overrides: Partial<{
    adrId: string;
    title: string;
    status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
    supersededBy: string;
    archgate: {
      enforced_by: Array<{ validator_id: string; error_code: string }>;
    };
  }> = {},
): ADR =>
  ADR.create(
    {
      adr_id: overrides.adrId ?? '001',
      title: overrides.title ?? 'Package Separation',
      status: overrides.status ?? 'Accepted',
      date: '2026-03-13',
      superseded_by: overrides.supersededBy,
      archgate: overrides.archgate
        ? {
            adr_id: overrides.adrId ?? '001',
            enforced_by: overrides.archgate.enforced_by,
          }
        : undefined,
    },
    {
      context: 'Context',
      decision: 'Decision',
      consequences: 'Consequences',
      alternatives: 'Alternatives',
    },
    new AdrValidationService(),
  );

target('toAdrDetailDto', () => {
  describe('ADR集約からAdrDetailDtoへ変換する', () => {
    // IT-AF-043
    context('基本的なADRを変換した場合', () => {
      it('adrRef, title, status, date, body, filePathが正しくマッピングされる', () => {
        // Arrange
        const basicAdr = createAdr();

        // Act
        const actual = toAdrDetailDto(basicAdr);

        // Assert
        expect(actual).toMatchObject({
          adrRef: 'ADR-001',
          title: 'Package Separation',
          status: 'Accepted',
          date: '2026-03-13',
          filePath: 'docs/ADR/001-package-separation.md',
          body: {
            context: 'Context',
            decision: 'Decision',
            consequences: 'Consequences',
            alternatives: 'Alternatives',
          },
        });
      });
    });

    // IT-AF-044
    context('archgate付きADRを変換した場合', () => {
      it('archgate情報がDTOに含まれる', () => {
        // Arrange
        const archgateAdr = createAdr({
          adrId: '002',
          title: 'Validator Stack Detection',
          archgate: {
            enforced_by: [
              { validator_id: 'phase-gate', error_code: 'L1-001' },
              { validator_id: 'architecture', error_code: 'L2-014' },
            ],
          },
        });

        // Act
        const actual = toAdrDetailDto(archgateAdr);

        // Assert
        expect(actual.archgate?.enforcedBy).toEqual([
          { validatorId: 'phase-gate', errorCode: 'L1-001' },
          { validatorId: 'architecture', errorCode: 'L2-014' },
        ]);
      });
    });

    // IT-AF-045
    context('superseded_by付きADRを変換した場合', () => {
      it('supersededBy情報がDTOに含まれる', () => {
        // Arrange
        const supersededAdr = createAdr({
          adrId: '004',
          title: 'Config File Separation',
          status: 'Superseded',
          supersededBy: 'ADR-005',
        });

        // Act
        const actual = toAdrDetailDto(supersededAdr);

        // Assert
        expect(actual.supersededBy).toBe('ADR-005');
      });
    });

    // IT-AF-046
    context('archgate/supersededByが未設定のADRを変換した場合', () => {
      it('該当フィールドがundefinedになる', () => {
        // Arrange
        const basicAdr = createAdr();

        // Act
        const actual = toAdrDetailDto(basicAdr);

        // Assert
        expect(actual.archgate).toBeUndefined();
        expect(actual.supersededBy).toBeUndefined();
      });
    });
  });
});
