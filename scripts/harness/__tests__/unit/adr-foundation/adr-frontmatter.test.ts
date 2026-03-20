import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';
import { AdrStatus } from '../../../adr-foundation/domain/value-objects/adr-status.js';
import {
  AdrFrontmatter,
  AdrValidationError,
  InvalidAdrStatusTransitionError,
  SupersededByRequiredError,
} from '../../../adr-foundation/domain/value-objects/adr-frontmatter.js';
import { ArchgateEntry } from '../../../adr-foundation/domain/value-objects/archgate-entry.js';
import {
  ArchgateMapping,
} from '../../../adr-foundation/domain/value-objects/archgate-mapping.js';
import { SupersededByRef } from '../../../adr-foundation/domain/value-objects/superseded-by-ref.js';

const createAdrId = (value = '001'): AdrId => AdrId.create(value);
const createAdrStatus = (value = 'Proposed'): AdrStatus => AdrStatus.create(value);
const createSupersededByRef = (value = '002'): SupersededByRef =>
  SupersededByRef.create(createAdrId(value));

const createArchgateEntry = (
  overrides?: Partial<{ validator_id: string; error_code: string }>,
): ArchgateEntry =>
  ArchgateEntry.create({
    validator_id: overrides?.validator_id ?? 'phase-gate',
    error_code: overrides?.error_code ?? 'L1-001',
  });

const createArchgateMapping = (
  overrides?: Partial<{
    adr_id: string;
    enforced_by: Array<{ validator_id: string; error_code: string }>;
  }>,
): ArchgateMapping =>
  ArchgateMapping.create({
    adr_id: overrides?.adr_id ?? '001',
    enforced_by:
      overrides?.enforced_by ?? [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
  });

const createAdrFrontmatter = (
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
): AdrFrontmatter =>
  AdrFrontmatter.create({
    adr_id: overrides?.adr_id ?? '001',
    title: overrides?.title ?? 'Package Separation',
    status: overrides?.status ?? 'Proposed',
    date: overrides?.date ?? '2026-03-13',
    superseded_by: overrides?.superseded_by,
    archgate: overrides?.archgate,
  });

target('AdrFrontmatter', () => {
  target('create', () => {
    // UT-AF-064
    context('正常な入力を渡す場合', () => {
      it('フロントマターが生成されること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          title: 'Package Separation',
          status: 'Proposed',
          date: '2026-03-13',
        };

        // Act
        const actual = AdrFrontmatter.create(input);

        // Assert
        expect(actual.adrId.equals(createAdrId('001'))).toBe(true);
        expect(actual.title).toBe('Package Separation');
        expect(actual.status.equals(createAdrStatus('Proposed'))).toBe(true);
        expect(actual.date).toBe('2026-03-13');
      });
    });

    // UT-AF-065
    context('タイトルが空文字の場合', () => {
      it('妥当性エラーが発生すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          title: '',
          status: 'Proposed',
          date: '2026-03-13',
        };

        // Act
        const actual = () => AdrFrontmatter.create(input);

        // Assert
        expect(actual).toThrowError(AdrValidationError);
      });
    });

    // UT-AF-066
    context('日付形式が不正な場合', () => {
      it('妥当性エラーが発生すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          title: 'Package Separation',
          status: 'Proposed',
          date: '2026-1-1',
        };

        // Act
        const actual = () => AdrFrontmatter.create(input);

        // Assert
        expect(actual).toThrowError(AdrValidationError);
      });
    });

    // UT-AF-067
    context('Supersededで後継参照が未指定の場合', () => {
      it('後継参照必須エラーが発生すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          title: 'Package Separation',
          status: 'Superseded',
          date: '2026-03-13',
        };

        // Act
        const actual = () => AdrFrontmatter.create(input);

        // Assert
        expect(actual).toThrowError(SupersededByRequiredError);
      });
    });

    // UT-AF-068
    context('Superseded以外で後継参照が含まれる場合', () => {
      it('後継参照が除去されること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          title: 'Package Separation',
          status: 'Accepted',
          date: '2026-03-13',
          superseded_by: 'ADR-002',
        };

        // Act
        const actual = AdrFrontmatter.create(input);

        // Assert
        expect(actual.toPrimitives()).not.toHaveProperty('superseded_by');
      });
    });

    // UT-AF-069
    context('archgateのADR識別子が一致しない場合', () => {
      it('妥当性エラーが発生すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          title: 'Package Separation',
          status: 'Proposed',
          date: '2026-03-13',
          archgate: {
            adr_id: '002',
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        };

        // Act
        const actual = () => AdrFrontmatter.create(input);

        // Assert
        expect(actual).toThrowError(AdrValidationError);
      });
    });

  });

  target('transitionStatus', () => {
    // UT-AF-072
    context('遷移後も元インスタンスを保持する場合', () => {
      it('元のインスタンスは変更されないこと', () => {
        // Arrange
        const sut = createAdrFrontmatter({ status: 'Proposed' });

        // Act
        const actual = sut.transitionStatus(createAdrStatus('Accepted'));

        // Assert
        expect(sut.status.equals(createAdrStatus('Proposed'))).toBe(true);
        expect(actual).not.toBe(sut);
      });
    });

    // UT-AF-073
    context('許可されていない遷移を行う場合', () => {
      it('状態遷移エラーが発生すること', () => {
        // Arrange
        const sut = createAdrFrontmatter({ status: 'Accepted' });
        const nextStatus = createAdrStatus('Proposed');

        // Act
        const actual = () => sut.transitionStatus(nextStatus);

        // Assert
        expect(actual).toThrowError(InvalidAdrStatusTransitionError);
      });
    });
  });

  target('withArchgate', () => {
    // UT-AF-076
    context('archgateを解除する場合', () => {
      it('archgateが未設定の新しいインスタンスが返ること', () => {
        // Arrange
        const sut = createAdrFrontmatter({
          archgate: {
            adr_id: '001',
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        });

        // Act
        const actual = sut.withArchgate(undefined);

        // Assert
        expect(actual.archgate).toBeUndefined();
      });
    });
  });

  target('toPrimitives', () => {
    // UT-AF-077
    context('archgateと後継参照を含む場合', () => {
      it('すべての項目がプリミティブへ変換されること', () => {
        // Arrange
        const sut = createAdrFrontmatter({
          status: 'Superseded',
          superseded_by: 'ADR-002',
          archgate: {
            adr_id: '001',
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        });

        // Act
        const actual = sut.toPrimitives();

        // Assert
        expect(actual).toMatchObject({
          adr_id: '001',
          title: 'Package Separation',
          status: 'Superseded',
          date: '2026-03-13',
          superseded_by: 'ADR-002',
          archgate: {
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        });
      });
    });

    // UT-AF-078
    context('archgateを持たない場合', () => {
      it('archgateキーが含まれないこと', () => {
        // Arrange
        const sut = createAdrFrontmatter();

        // Act
        const actual = sut.toPrimitives();

        // Assert
        expect(actual).not.toHaveProperty('archgate');
      });
    });

    // UT-AF-079
    context('後継参照を持たない場合', () => {
      it('superseded_byキーが含まれないこと', () => {
        // Arrange
        const sut = createAdrFrontmatter();

        // Act
        const actual = sut.toPrimitives();

        // Assert
        expect(actual).not.toHaveProperty('superseded_by');
      });
    });
  });
});
