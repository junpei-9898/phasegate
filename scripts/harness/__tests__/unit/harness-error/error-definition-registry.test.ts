/**
 * @layer domain
 * @unit harness-error
 * @story H06-01
 *
 * ErrorDefinitionRegistry ドメインサービスのユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { UnknownErrorDefinitionError } from '../../../harness-error/domain/errors/unknown-error-definition-error.js';
import { DuplicateErrorCodeError } from '../../../harness-error/domain/errors/duplicate-error-code-error.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);

const createErrorDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  ErrorDefinition.create({
    code: createErrorCode(),
    title: 'フェーズゲート違反',
    category: 'phase_gate',
    defaultSeverity: createSeverity('warning'),
    adrRefRequired: false,
    defaultAdrRef: null,
    fixExampleRequired: false,
    defaultFixExample: null,
    ownerValidatorId: 'phase-gate',
    ...overrides,
  });

const createRegistry = (definitions: ErrorDefinition[] = []) =>
  new ErrorDefinitionRegistry(definitions);

target('ErrorDefinitionRegistry', () => {
  target('constructor', () => {
    context('重複codeのErrorDefinitionが渡された場合', () => {
      // UT-HE-089
      it('DuplicateErrorCodeErrorをthrowすること', () => {
        // Arrange
        const duplicateCode = createErrorCode('L1-001');
        const definitions = [
          createErrorDefinition({ code: duplicateCode }),
          createErrorDefinition({ code: duplicateCode }),
        ];

        // Act
        const actual = () => new ErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrowError(DuplicateErrorCodeError);
      });
    });

    describe('空の定義配列でレジストリを構築する', () => {
      // UT-HE-092
      it('正常に構築されること', () => {
        // Arrange
        const definitions: ErrorDefinition[] = [];

        // Act
        const actual = new ErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual.getAllDefinitions()).toEqual([]);
      });
    });
  });

  target('getDefinition', () => {
    describe('登録済みコードに対して定義を取得する', () => {
      // UT-HE-079
      it('対応するErrorDefinitionが返されること', () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L2-010') });
        const sut = createRegistry([definition]);

        // Act
        const actual = sut.getDefinition(createErrorCode('L2-010'));

        // Assert
        expect(actual.equals(definition)).toBe(true);
      });
    });

    context('未登録コードが指定された場合', () => {
      // UT-HE-080
      it('UnknownErrorDefinitionErrorをthrowすること', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L2-010') })]);

        // Act
        const actual = () => sut.getDefinition(createErrorCode('L2-999'));

        // Assert
        expect(actual).toThrowError(UnknownErrorDefinitionError);
      });
    });
  });

  target('getAllDefinitions', () => {
    describe('全定義を返す', () => {
      // UT-HE-081
      it('code昇順で全定義が返されること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L2-020') }),
          createErrorDefinition({ code: createErrorCode('L1-010') }),
          createErrorDefinition({ code: createErrorCode('L1-002') }),
        ]);

        // Act
        const actual = sut.getAllDefinitions();

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual([
          'L1-002',
          'L1-010',
          'L2-020',
        ]);
      });

    });
  });

  target('listByValidator', () => {
    describe('指定validatorIdの定義のみを返す', () => {
      // UT-HE-083
      it('該当validatorIdの定義のみが含まれること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L1-001'), ownerValidatorId: 'phase-gate' }),
          createErrorDefinition({ code: createErrorCode('L1-002'), ownerValidatorId: 'security' }),
          createErrorDefinition({ code: createErrorCode('L1-003'), ownerValidatorId: 'phase-gate' }),
        ]);

        // Act
        const actual = sut.listByValidator('phase-gate');

        // Assert
        expect(actual.map((definition) => definition.ownerValidatorId)).toEqual([
          'phase-gate',
          'phase-gate',
        ]);
      });

      // UT-HE-090
      it('code昇順で返されること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L1-010'), ownerValidatorId: 'phase-gate' }),
          createErrorDefinition({ code: createErrorCode('L1-002'), ownerValidatorId: 'phase-gate' }),
        ]);

        // Act
        const actual = sut.listByValidator('phase-gate');

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual(['L1-002', 'L1-010']);
      });
    });

    context('該当するvalidatorIdが存在しない場合', () => {
      // UT-HE-084
      it('空配列を返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ ownerValidatorId: 'phase-gate' })]);

        // Act
        const actual = sut.listByValidator('security');

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('listByLayer', () => {
    describe('指定layerの定義のみを返す', () => {
      // UT-HE-085
      it('該当layerの定義のみが含まれること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L1-001') }),
          createErrorDefinition({ code: createErrorCode('L2-001') }),
          createErrorDefinition({ code: createErrorCode('L1-002') }),
        ]);

        // Act
        const actual = sut.listByLayer(1);

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual(['L1-001', 'L1-002']);
      });

      // UT-HE-091
      it('code昇順で返されること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L2-010') }),
          createErrorDefinition({ code: createErrorCode('L2-002') }),
        ]);

        // Act
        const actual = sut.listByLayer(2);

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual(['L2-002', 'L2-010']);
      });
    });

    context('該当するlayerの定義が存在しない場合', () => {
      // UT-HE-086
      it('空配列を返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L1-001') })]);

        // Act
        const actual = sut.listByLayer(4);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('hasDefinition', () => {
    describe('コード存在有無を返す', () => {
      // UT-HE-087
      it('登録済みコードに対してtrueを返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L1-001') })]);

        // Act
        const actual = sut.hasDefinition(createErrorCode('L1-001'));

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-088
      it('未登録コードに対してfalseを返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L1-001') })]);

        // Act
        const actual = sut.hasDefinition(createErrorCode('L1-999'));

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
