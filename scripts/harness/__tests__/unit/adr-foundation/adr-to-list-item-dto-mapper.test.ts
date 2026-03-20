import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { toAdrListItemDto } from '../../../adr-foundation/application/mappers/adr-to-list-item-dto-mapper.js';
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

target('toAdrListItemDto', () => {
  describe('ADR集約からAdrListItemDtoへ変換する', () => {
    // IT-AF-047
    context('基本的なADRを変換した場合', () => {
      it('adrRef, title, status, dateが正しくマッピングされる', () => {
        // Arrange
        const basicAdr = createAdr();

        // Act
        const actual = toAdrListItemDto(basicAdr);

        // Assert
        expect(actual).toMatchObject({
          adrRef: 'ADR-001',
          title: 'Package Separation',
          status: 'Accepted',
          date: '2026-03-13',
        });
      });
    });

    // IT-AF-048
    context('archgate付きADRを変換した場合', () => {
      it('hasArchgate=trueが設定される', () => {
        // Arrange
        const archgateAdr = createAdr({
          archgate: {
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        });

        // Act
        const actual = toAdrListItemDto(archgateAdr);

        // Assert
        expect(actual.hasArchgate).toBe(true);
      });
    });

    // IT-AF-049
    context('archgateなしADRを変換した場合', () => {
      it('hasArchgate=falseが設定される', () => {
        // Arrange
        const basicAdr = createAdr();

        // Act
        const actual = toAdrListItemDto(basicAdr);

        // Assert
        expect(actual.hasArchgate).toBe(false);
      });
    });

    // IT-AF-050
    context('superseded_by付きADRを変換した場合', () => {
      it('supersededByが設定される', () => {
        // Arrange
        const supersededAdr = createAdr({
          adrId: '004',
          status: 'Superseded',
          supersededBy: 'ADR-005',
        });

        // Act
        const actual = toAdrListItemDto(supersededAdr);

        // Assert
        expect(actual.supersededBy).toBe('ADR-005');
      });
    });
  });
});
