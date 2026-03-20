import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  ArchgateMapping,
  DuplicateArchgateEntryError,
} from '../../../adr-foundation/domain/value-objects/archgate-mapping.js';

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

target('ArchgateMapping', () => {
  target('create', () => {
    // UT-AF-100
    context('enforced_byが1件の場合', () => {
      it('1件のエントリを保持したmappingが生成されること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
        };

        // Act
        const actual = ArchgateMapping.create(input);

        // Assert
        expect(actual.enforcedBy).toHaveLength(1);
      });
    });

    // UT-AF-101
    context('enforced_byが複数件の場合', () => {
      it('すべてのエントリを保持すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'architecture', error_code: 'L2-002' },
          ],
        };

        // Act
        const actual = ArchgateMapping.create(input);

        // Assert
        expect(actual.enforcedBy).toHaveLength(2);
      });
    });

    // UT-AF-102
    context('enforced_byが空配列の場合', () => {
      it('生成に失敗すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          enforced_by: [] as Array<{ validator_id: string; error_code: string }>,
        };

        // Act
        const actual = () => ArchgateMapping.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-AF-103
    context('重複エントリを含む場合', () => {
      it('重複エラーが発生すること', () => {
        // Arrange
        const input = {
          adr_id: '001',
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'phase-gate', error_code: 'L1-001' },
          ],
        };

        // Act
        const actual = () => ArchgateMapping.create(input);

        // Assert
        expect(actual).toThrowError(DuplicateArchgateEntryError);
      });
    });
  });

  target('findByValidatorId', () => {
    // UT-AF-104
    context('一致するvalidator_idが存在する場合', () => {
      it('一致するエントリのみ返すこと', () => {
        // Arrange
        const sut = createArchgateMapping({
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'architecture', error_code: 'L2-002' },
          ],
        });

        // Act
        const actual = sut.findByValidatorId('phase-gate');

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]?.validatorId).toBe('phase-gate');
      });
    });

    // UT-AF-105
    context('一致するvalidator_idが存在しない場合', () => {
      it('空配列を返すこと', () => {
        // Arrange
        const sut = createArchgateMapping();

        // Act
        const actual = sut.findByValidatorId('consistency');

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('findByErrorCode', () => {
    // UT-AF-106
    context('一致するerror_codeが存在する場合', () => {
      it('一致するエントリのみ返すこと', () => {
        // Arrange
        const sut = createArchgateMapping({
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'architecture', error_code: 'L2-002' },
          ],
        });

        // Act
        const actual = sut.findByErrorCode('L1-001');

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]?.errorCode).toBe('L1-001');
      });
    });

    // UT-AF-107
    context('一致するerror_codeが存在しない場合', () => {
      it('空配列を返すこと', () => {
        // Arrange
        const sut = createArchgateMapping();

        // Act
        const actual = sut.findByErrorCode('L2-999');

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('hasEntry', () => {
    // UT-AF-108
    context('一致する組み合わせが存在する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createArchgateMapping();

        // Act
        const actual = sut.hasEntry('phase-gate', 'L1-001');

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-109
    context('一致する組み合わせが存在しない場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createArchgateMapping();

        // Act
        const actual = sut.hasEntry('phase-gate', 'L1-999');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('toPrimitives', () => {
    // UT-AF-110
    context('複数エントリを保持している場合', () => {
      it('複数要素のプリミティブ配列へ変換できること', () => {
        // Arrange
        const sut = createArchgateMapping({
          enforced_by: [
            { validator_id: 'phase-gate', error_code: 'L1-001' },
            { validator_id: 'architecture', error_code: 'L2-002' },
          ],
        });

        // Act
        const actual = sut.toPrimitives();

        // Assert
        expect(actual.enforced_by).toHaveLength(2);
      });
    });

    // UT-AF-111
    context('1件のエントリを保持している場合', () => {
      it('長さ1の配列へ変換できること', () => {
        // Arrange
        const sut = createArchgateMapping();

        // Act
        const actual = sut.toPrimitives();

        // Assert
        expect(actual.enforced_by).toHaveLength(1);
      });
    });
  });
});
