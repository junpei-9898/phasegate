/**
 * @layer application
 * @unit harness-error
 * @story H06-01
 *
 * ListErrorDefinitionsUseCase のユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { ListErrorDefinitionsQuery } from '../../../harness-error/application/dto/list-error-definitions-query.js';
import { ListErrorDefinitionsUseCase } from '../../../harness-error/application/usecases/list-error-definitions-use-case.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
const createFixExample = (value = 'const repaired = true;') => FixExample.create(value);

const createErrorDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  ErrorDefinition.create({
    code: createErrorCode(),
    title: 'フェーズゲート違反',
    category: 'phase_gate',
    defaultSeverity: createSeverity('error'),
    adrRefRequired: false,
    defaultAdrRef: null,
    fixExampleRequired: true,
    defaultFixExample: createFixExample('const fixedValue = true;'),
    ownerValidatorId: 'phase-gate',
    ...overrides,
  });

const createRegistry = () =>
  new ErrorDefinitionRegistry([
    createErrorDefinition({
      code: createErrorCode('L1-001'),
      ownerValidatorId: 'phase-gate',
      category: 'phase_gate',
    }),
    createErrorDefinition({
      code: createErrorCode('L1-002'),
      ownerValidatorId: 'architecture',
      category: 'architecture',
      title: 'アーキテクチャ違反',
      defaultSeverity: createSeverity('warning'),
      defaultFixExample: createFixExample('const architectureFixed = true;'),
    }),
    createErrorDefinition({
      code: createErrorCode('L2-010'),
      ownerValidatorId: 'dependency',
      category: 'dependency',
      title: '依存違反',
      defaultSeverity: createSeverity('warning'),
      defaultFixExample: createFixExample('const dependencyFixed = true;'),
    }),
    createErrorDefinition({
      code: createErrorCode('L4-001'),
      ownerValidatorId: 'drift-detector',
      category: 'consistency',
      title: 'ドリフト検出',
      defaultSeverity: createSeverity('warning'),
      defaultFixExample: createFixExample('const driftFixed = true;'),
    }),
  ]);

const buildListErrorDefinitionsQuery = (
  overrides: Partial<ListErrorDefinitionsQuery> = {}
): ListErrorDefinitionsQuery => ({
  ...overrides,
});

target('ListErrorDefinitionsUseCase.execute', () => {
  describe('error definitionカタログを列挙する', () => {
    context('フィルタなしの場合', () => {
      // IT-HE-041
      it('全定義がErrorDefinitionSummaryとして返されること', async () => {
        // Arrange
        const registry = createRegistry();
        const sut = new ListErrorDefinitionsUseCase({
          errorDefinitionRegistry: registry,
        });

        // Act
        const actual = await sut.execute(buildListErrorDefinitionsQuery());

        // Assert
        expect(actual).toHaveLength(registry.getAllDefinitions().length);
      });
    });

    context('layerフィルタを指定する場合', () => {
      // IT-HE-042
      it('layerフィルタが適用されること', async () => {
        // Arrange
        const sut = new ListErrorDefinitionsUseCase({
          errorDefinitionRegistry: createRegistry(),
        });

        // Act
        const actual = await sut.execute(
          buildListErrorDefinitionsQuery({ layer: 'L1' })
        );

        // Assert
        expect(actual.every((definition) => definition.code.startsWith('L1-'))).toBe(true);
      });
    });

    context('validatorIdフィルタを指定する場合', () => {
      // IT-HE-043
      it('validatorIdフィルタが適用されること', async () => {
        // Arrange
        const sut = new ListErrorDefinitionsUseCase({
          errorDefinitionRegistry: createRegistry(),
        });

        // Act
        const actual = await sut.execute(
          buildListErrorDefinitionsQuery({ validatorId: 'phase-gate' })
        );

        // Assert
        expect(actual.every((definition) => definition.validatorId === 'phase-gate')).toBe(true);
      });
    });

    context('categoryフィルタを指定する場合', () => {
      // IT-HE-044
      it('categoryフィルタが適用されること', async () => {
        // Arrange
        const sut = new ListErrorDefinitionsUseCase({
          errorDefinitionRegistry: createRegistry(),
        });

        // Act
        const actual = await sut.execute(
          buildListErrorDefinitionsQuery({ category: 'architecture' })
        );

        // Assert
        expect(actual.every((definition) => definition.category === 'architecture')).toBe(true);
      });
    });

    context('一致する定義がない場合', () => {
      // IT-HE-045
      it('空配列が返されること', async () => {
        // Arrange
        const sut = new ListErrorDefinitionsUseCase({
          errorDefinitionRegistry: createRegistry(),
        });

        // Act
        const actual = await sut.execute(
          buildListErrorDefinitionsQuery({
            layer: 'L4',
            validatorId: 'phase-gate',
          })
        );

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('複数フィルタを組み合わせる場合', () => {
      // IT-HE-046
      it('AND条件が正しく適用されること', async () => {
        // Arrange
        const sut = new ListErrorDefinitionsUseCase({
          errorDefinitionRegistry: createRegistry(),
        });

        // Act
        const actual = await sut.execute(
          buildListErrorDefinitionsQuery({
            layer: 'L1',
            validatorId: 'phase-gate',
          })
        );

        // Assert
        expect(
          actual.every(
            (definition) =>
              definition.code.startsWith('L1-') &&
              definition.validatorId === 'phase-gate'
          )
        ).toBe(true);
      });
    });
  });
});
