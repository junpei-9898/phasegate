// @layer test
// @story H01-02
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  mapRuleNameToCode,
  mapCodeToRuleName,
  UnknownRuleCodeMappingError,
} from '../../../biome-ast-engine/infrastructure/mappers/rule-violation-code-mapper.js';

target('mapRuleNameToCode', () => {
  describe('ルール名をエラーコードに変換する', () => {
    context('require-unit-commentを指定した場合', () => {
      it('L1-001が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('require-unit-comment');

        // Assert
        expect(actual).toBe('L1-001');
      });
    });

    context('require-layer-commentを指定した場合', () => {
      it('L1-002が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('require-layer-comment');

        // Assert
        expect(actual).toBe('L1-002');
      });
    });

    context('no-layer-violationを指定した場合', () => {
      it('L1-003が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('no-layer-violation');

        // Assert
        expect(actual).toBe('L1-003');
      });
    });

    context('enforce-folder-structureを指定した場合', () => {
      it('L1-004が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('enforce-folder-structure');

        // Assert
        expect(actual).toBe('L1-004');
      });
    });

    context('no-any-abuseを指定した場合', () => {
      it('L1-005が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('no-any-abuse');

        // Assert
        expect(actual).toBe('L1-005');
      });
    });

    context('no-ghost-fileを指定した場合', () => {
      it('L1-006が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('no-ghost-file');

        // Assert
        expect(actual).toBe('L1-006');
      });
    });

    context('no-comment-floodを指定した場合', () => {
      it('L1-007が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('no-comment-flood');

        // Assert
        expect(actual).toBe('L1-007');
      });
    });

    context('no-code-duplicationを指定した場合', () => {
      it('L1-008が返される', () => {
        // Arrange & Act
        const actual = mapRuleNameToCode('no-code-duplication');

        // Assert
        expect(actual).toBe('L1-008');
      });
    });

    context('未定義のルール名を指定した場合', () => {
      it('UnknownRuleCodeMappingErrorがスローされる', () => {
        // Arrange & Act
        const actual = () => mapRuleNameToCode('unknown-rule');

        // Assert
        expect(actual).toThrow(UnknownRuleCodeMappingError);
      });
    });
  });
});

target('mapCodeToRuleName', () => {
  describe('エラーコードからルール名を逆引きする', () => {
    context('L1-001を指定した場合', () => {
      it('require-unit-commentが返される', () => {
        // Arrange & Act
        const actual = mapCodeToRuleName('L1-001');

        // Assert
        expect(actual).toBe('require-unit-comment');
      });
    });

    context('L1-008を指定した場合', () => {
      it('no-code-duplicationが返される', () => {
        // Arrange & Act
        const actual = mapCodeToRuleName('L1-008');

        // Assert
        expect(actual).toBe('no-code-duplication');
      });
    });

    context('未定義のエラーコードを指定した場合', () => {
      it('UnknownRuleCodeMappingErrorがスローされる', () => {
        // Arrange & Act
        const actual = () => mapCodeToRuleName('L1-999');

        // Assert
        expect(actual).toThrow(UnknownRuleCodeMappingError);
      });
    });
  });
});
