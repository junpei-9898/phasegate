// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrBodySectionRequiredError } from '../../../adr-foundation/domain/value-objects/adr-body.js';
import {
  AdrValidationError,
  SupersededByRequiredError,
} from '../../../adr-foundation/domain/value-objects/adr-frontmatter.js';
import { InvalidArchgateErrorCodeError } from '../../../adr-foundation/domain/value-objects/archgate-entry.js';
import { DuplicateArchgateEntryError } from '../../../adr-foundation/domain/value-objects/archgate-mapping.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';

const createValidationService = (): AdrValidationService => new AdrValidationService();

const buildFrontmatterPrimitives = (
  overrides?: Partial<{
    adr_id: string;
    title: string;
    status: string;
    date: string;
    superseded_by: string;
    archgate: {
      adr_id?: string;
      enforced_by: Array<{ validator_id: string; error_code: string }>;
    };
  }>,
) => ({
  adr_id: overrides?.adr_id ?? '001',
  title: overrides?.title ?? 'Package Separation',
  status: overrides?.status ?? 'Proposed',
  date: overrides?.date ?? '2026-03-13',
  superseded_by: overrides?.superseded_by,
  archgate: overrides?.archgate,
});

const buildBodyPrimitives = (
  overrides?: Partial<{
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string;
  }>,
) => ({
  context: overrides?.context ?? '背景',
  decision: overrides?.decision ?? '判断',
  consequences: overrides?.consequences ?? '結果',
  alternatives: overrides?.alternatives,
});

const buildArchgatePrimitives = (
  overrides?: Partial<{
    adr_id: string;
    enforced_by: Array<{ validator_id: string; error_code: string }>;
  }>,
) => ({
  adr_id: overrides?.adr_id ?? '001',
  enforced_by:
    overrides?.enforced_by ?? [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
});

target('AdrValidationService', () => {
  target('validateFrontmatter', () => {
    // UT-AF-127
    context('正常なfrontmatterを検証する場合', () => {
      it('例外が発生しないこと', () => {
        // Arrange
        const service = createValidationService();
        const input = buildFrontmatterPrimitives();

        // Act
        const actual = () => service.validateFrontmatter(input);

        // Assert
        expect(actual).not.toThrow();
      });
    });

    // UT-AF-128
    context('必須項目が欠落している場合', () => {
      it('妥当性エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildFrontmatterPrimitives({ title: '' });

        // Act
        const actual = () => service.validateFrontmatter(input);

        // Assert
        expect(actual).toThrowError(AdrValidationError);
      });
    });

    // UT-AF-129
    context('Supersededで後継参照が未指定の場合', () => {
      it('後継参照必須エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildFrontmatterPrimitives({ status: 'Superseded' });

        // Act
        const actual = () => service.validateFrontmatter(input);

        // Assert
        expect(actual).toThrowError(SupersededByRequiredError);
      });
    });

    // UT-AF-130
    context('archgateのADR識別子が一致しない場合', () => {
      it('妥当性エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildFrontmatterPrimitives({
          archgate: {
            adr_id: '002',
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        });

        // Act
        const actual = () => service.validateFrontmatter(input);

        // Assert
        expect(actual).toThrowError(AdrValidationError);
      });
    });

    // UT-AF-131
    context('archgateに不正なerror_codeを含む場合', () => {
      it('error_code形式エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildFrontmatterPrimitives({
          archgate: {
            adr_id: '001',
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'X1-001' }],
          },
        });

        // Act
        const actual = () => service.validateFrontmatter(input);

        // Assert
        expect(actual).toThrowError(InvalidArchgateErrorCodeError);
      });
    });

    // UT-AF-132
    context('archgateに重複エントリを含む場合', () => {
      it('重複エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildFrontmatterPrimitives({
          archgate: {
            adr_id: '001',
            enforced_by: [
              { validator_id: 'phase-gate', error_code: 'L1-001' },
              { validator_id: 'phase-gate', error_code: 'L1-001' },
            ],
          },
        });

        // Act
        const actual = () => service.validateFrontmatter(input);

        // Assert
        expect(actual).toThrowError(DuplicateArchgateEntryError);
      });
    });
  });

  target('validateBody', () => {
    // UT-AF-133
    context('正常なbodyを検証する場合', () => {
      it('例外が発生しないこと', () => {
        // Arrange
        const service = createValidationService();
        const input = buildBodyPrimitives();

        // Act
        const actual = () => service.validateBody(input);

        // Assert
        expect(actual).not.toThrow();
      });
    });

    // UT-AF-134
    context('必須セクションが空の場合', () => {
      it('本文必須セクションエラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildBodyPrimitives({ decision: '' });

        // Act
        const actual = () => service.validateBody(input);

        // Assert
        expect(actual).toThrowError(AdrBodySectionRequiredError);
      });
    });

    // UT-AF-135
    context('alternativesが空白のみの場合', () => {
      it('本文必須セクションエラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildBodyPrimitives({ alternatives: '   ' });

        // Act
        const actual = () => service.validateBody(input);

        // Assert
        expect(actual).toThrowError(AdrBodySectionRequiredError);
      });
    });

    // UT-AF-136
    context('alternativesが未指定の場合', () => {
      it('例外が発生しないこと', () => {
        // Arrange
        const service = createValidationService();
        const input = buildBodyPrimitives({ alternatives: undefined });

        // Act
        const actual = () => service.validateBody(input);

        // Assert
        expect(actual).not.toThrow();
      });
    });
  });

  target('validateArchgate', () => {
    // UT-AF-137
    context('正常なarchgateを検証する場合', () => {
      it('例外が発生しないこと', () => {
        // Arrange
        const service = createValidationService();
        const input = buildArchgatePrimitives();

        // Act
        const actual = () => service.validateArchgate(input);

        // Assert
        expect(actual).not.toThrow();
      });
    });

    // UT-AF-138
    context('不正なerror_codeを含むarchgateを検証する場合', () => {
      it('error_code形式エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildArchgatePrimitives({
          enforced_by: [{ validator_id: 'phase-gate', error_code: 'X1-001' }],
        });

        // Act
        const actual = () => service.validateArchgate(input);

        // Assert
        expect(actual).toThrowError(InvalidArchgateErrorCodeError);
      });
    });

    // UT-AF-139
    context('重複エントリを含むarchgateを検証する場合', () => {
      it('重複エラーが発生すること', () => {
        // Arrange
        const service = createValidationService();
        const input = buildArchgatePrimitives({
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'phase-gate', error_code: 'L1-001' },
          ],
        });

        // Act
        const actual = () => service.validateArchgate(input);

        // Assert
        expect(actual).toThrowError(DuplicateArchgateEntryError);
      });
    });
  });
});
