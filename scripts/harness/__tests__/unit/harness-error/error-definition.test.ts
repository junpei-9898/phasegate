/**
 * @layer domain
 * @unit harness-error
 *
 * ErrorDefinition 値オブジェクトのユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
const createAdrRef = (value = 'ADR-001') => AdrRef.create(value);
const createFixExample = (value = 'const repaired = true;') => FixExample.create(value);

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

const createAdrRequiredDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  createErrorDefinition({
    adrRefRequired: true,
    defaultAdrRef: createAdrRef('ADR-010'),
    ...overrides,
  });

const createFixExampleRequiredDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  createErrorDefinition({
    fixExampleRequired: true,
    defaultFixExample: createFixExample('const fixedValue = 1;'),
    ...overrides,
  });

target('ErrorDefinition', () => {
  target('create', () => {
    describe('全属性を指定してErrorDefinitionを生成する', () => {
      // UT-HE-039
      it('全属性が正しく設定されたErrorDefinitionが生成されること', () => {
        // Arrange
        const params: ErrorDefinitionProps = {
          code: createErrorCode('L2-010'),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: true,
          defaultAdrRef: createAdrRef('ADR-010'),
          fixExampleRequired: true,
          defaultFixExample: createFixExample('const fixedValue = 1;'),
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = ErrorDefinition.create(params);

        // Assert
        expect(actual.code.toString()).toBe('L2-010');
        expect(actual.defaultSeverity.value).toBe('warning');
        expect(actual.requiresAdrRef()).toBe(true);
        expect(actual.requiresFixExample()).toBe(true);
      });

      // UT-HE-050
      it('defaultSeverityがwarningの定義を正常生成できること', () => {
        // Arrange
        const params: ErrorDefinitionProps = {
          code: createErrorCode('L2-011'),
          title: 'warning既定の定義',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: null,
          fixExampleRequired: false,
          defaultFixExample: null,
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = ErrorDefinition.create(params);

        // Assert
        expect(actual.defaultSeverity.value).toBe('warning');
      });
    });

    context('defaultAdrRefを持つがadrRefRequiredがfalseの場合', () => {
      // UT-HE-049
      it('DDD不変条件違反としてエラーをthrowすること', () => {
        // Arrange
        const params: ErrorDefinitionProps = {
          code: createErrorCode(),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: createAdrRef('ADR-010'),
          fixExampleRequired: false,
          defaultFixExample: null,
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = () => ErrorDefinition.create(params);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('fixExampleRequiredがtrueでdefaultFixExampleがnullの場合', () => {
      // UT-HE-051
      it('呼び出し側がfixExampleを提供する前提として許容されること', () => {
        // Arrange
        const params: ErrorDefinitionProps = {
          code: createErrorCode(),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: null,
          fixExampleRequired: true,
          defaultFixExample: null,
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = ErrorDefinition.create(params);

        // Assert
        expect(actual.requiresFixExample()).toBe(true);
        expect(actual.defaultFixExample).toBeNull();
      });
    });

    context('ownerValidatorIdが空文字の場合', () => {
      // UT-HE-052
      it('入力不正として拒否されること', () => {
        // Arrange
        const params: ErrorDefinitionProps = {
          code: createErrorCode(),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: null,
          fixExampleRequired: false,
          defaultFixExample: null,
          ownerValidatorId: '',
        };

        // Act
        const actual = () => ErrorDefinition.create(params);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('requiresAdrRef', () => {
    describe('ADR必須フラグを返す', () => {
      // UT-HE-040
      it('adrRefRequiredがtrueの場合にtrueを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition();

        // Act
        const actual = sut.requiresAdrRef();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('requiresFixExample', () => {
    describe('fix_example必須フラグを返す', () => {
      // UT-HE-041
      it('fixExampleRequiredがtrueの場合にtrueを返すこと', () => {
        // Arrange
        const sut = createFixExampleRequiredDefinition();

        // Act
        const actual = sut.requiresFixExample();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('resolveAdrRef', () => {
    describe('ADRを解決する', () => {
      // UT-HE-042
      it('明示的に渡されたAdrRefを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition({ defaultAdrRef: createAdrRef('ADR-010') });
        const explicitAdrRef = createAdrRef('ADR-011');

        // Act
        const actual = sut.resolveAdrRef(explicitAdrRef);

        // Assert
        expect(actual?.toString()).toBe('ADR-011');
      });

      // UT-HE-043
      it('defaultAdrRefを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition({ defaultAdrRef: createAdrRef('ADR-010') });

        // Act
        const actual = sut.resolveAdrRef(null);

        // Assert
        expect(actual?.toString()).toBe('ADR-010');
      });

      // UT-HE-044
      it('nullを返すこと', () => {
        // Arrange
        const sut = createErrorDefinition({ adrRefRequired: false, defaultAdrRef: null });

        // Act
        const actual = sut.resolveAdrRef(null);

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  target('resolveFixExample', () => {
    describe('fix_exampleを解決する', () => {
      // UT-HE-045
      it('明示的に渡されたFixExampleを返すこと', () => {
        // Arrange
        const sut = createFixExampleRequiredDefinition();
        const explicitFixExample = createFixExample('const explicit = 1;');

        // Act
        const actual = sut.resolveFixExample(explicitFixExample);

        // Assert
        expect(actual?.toString()).toBe('const explicit = 1;');
      });

      // UT-HE-046
      it('defaultFixExampleを返すこと', () => {
        // Arrange
        const sut = createFixExampleRequiredDefinition({
          defaultFixExample: createFixExample('const defaultValue = 1;'),
        });

        // Act
        const actual = sut.resolveFixExample(null);

        // Assert
        expect(actual?.toString()).toBe('const defaultValue = 1;');
      });

      // UT-HE-047
      it('nullを返すこと', () => {
        // Arrange
        const sut = createErrorDefinition({ fixExampleRequired: false, defaultFixExample: null });

        // Act
        const actual = sut.resolveFixExample(null);

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  target('equals', () => {
    describe('同一属性のErrorDefinition同士を比較する', () => {
      // UT-HE-048
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition({
          code: createErrorCode('L2-010'),
          defaultFixExample: createFixExample('const fixedValue = 1;'),
          fixExampleRequired: true,
        });
        const other = createAdrRequiredDefinition({
          code: createErrorCode('L2-010'),
          defaultFixExample: createFixExample('const fixedValue = 1;'),
          fixExampleRequired: true,
        });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // ISSUE-007 Wave 3 / H12-03: actionable defaults
  target('actionable defaults (defaultSuggestedSkill / defaultScaffoldCommand / defaultTemplatePath)', () => {
    describe('3 optional フィールドの保持と解決', () => {
      // UT-HE-120
      it('defaultSuggestedSkill を保持すること', () => {
        // Arrange
        const sut = createErrorDefinition({ defaultSuggestedSkill: '/story-implementor' });

        // Act
        const actual = sut.defaultSuggestedSkill;

        // Assert
        expect(actual).toBe('/story-implementor');
      });

      // UT-HE-121
      it('defaultScaffoldCommand を保持すること', () => {
        // Arrange
        const sut = createErrorDefinition({
          defaultScaffoldCommand: 'npx phasegate scaffold-design --unit x --phase logical',
        });

        // Act
        const actual = sut.defaultScaffoldCommand;

        // Assert
        expect(actual).toBe('npx phasegate scaffold-design --unit x --phase logical');
      });

      // UT-HE-122
      it('defaultTemplatePath を保持すること', () => {
        // Arrange
        const sut = createErrorDefinition({
          defaultTemplatePath: 'docs/templates/logical_design.template.md',
        });

        // Act
        const actual = sut.defaultTemplatePath;

        // Assert
        expect(actual).toBe('docs/templates/logical_design.template.md');
      });

      // UT-HE-123
      it('未指定のとき 3 フィールドは null であること', () => {
        // Arrange
        const sut = createErrorDefinition();

        // Assert
        expect(sut.defaultSuggestedSkill).toBeNull();
        expect(sut.defaultScaffoldCommand).toBeNull();
        expect(sut.defaultTemplatePath).toBeNull();
      });
    });

    describe('resolve* メソッド', () => {
      // UT-HE-124
      it('resolveSuggestedSkill: 明示引数が優先される', () => {
        // Arrange
        const sut = createErrorDefinition({ defaultSuggestedSkill: '/story-implementor' });

        // Act
        const actual = sut.resolveSuggestedSkill('/logical-designer');

        // Assert
        expect(actual).toBe('/logical-designer');
      });

      // UT-HE-125
      it('resolveSuggestedSkill: 明示引数が null の場合 default が返る', () => {
        // Arrange
        const sut = createErrorDefinition({ defaultSuggestedSkill: '/story-implementor' });

        // Act
        const actual = sut.resolveSuggestedSkill(null);

        // Assert
        expect(actual).toBe('/story-implementor');
      });

      // UT-HE-126
      it('resolveScaffoldCommand: 明示引数が優先される', () => {
        // Arrange
        const sut = createErrorDefinition({ defaultScaffoldCommand: 'npx phasegate scaffold-design --unit a' });

        // Act
        const actual = sut.resolveScaffoldCommand('npx phasegate scaffold-design --unit b');

        // Assert
        expect(actual).toBe('npx phasegate scaffold-design --unit b');
      });

      // UT-HE-127
      it('resolveTemplatePath: 明示引数が null で default も null なら null を返す', () => {
        // Arrange
        const sut = createErrorDefinition();

        // Act
        const actual = sut.resolveTemplatePath(null);

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
