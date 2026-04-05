// @unit phase-dependency-model
// @layer infrastructure

import { expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { GateGraphValidationError } from '../../../phase-dependency-model/domain/services/gate-graph.js';
import { InvalidGateDefinitionError } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { CustomGatesConfigParser } from '../../../phase-dependency-model/infrastructure/config/custom-gates-config-parser.js';

target('CustomGatesConfigParser', () => {
  it('単一ゲート定義から GateDefinition と GateGraph を生成できること', () => {
    // Arrange
    const sut = new CustomGatesConfigParser();
    const raw = [
      {
        name: 'domain-designer',
        level: 2,
        requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
        blocks: ['scripts/harness/example/**'],
        dependsOn: [],
      },
    ];

    // Act
    const actual = sut.parse(raw);

    // Assert
    expect(actual.gates).toHaveLength(1);
    expect(actual.gates[0]?.name.value).toBe('domain-designer');
    expect(actual.graph.gates.has('domain-designer')).toBe(true);
  });

  it('dependsOn 連鎖を含む複数ゲートをパースできること', () => {
    // Arrange
    const sut = new CustomGatesConfigParser();
    const raw = [
      {
        name: 'product-architect',
        level: 1,
        requires: [{ path: 'docs/product/product_overview.md', required: true }],
        blocks: [],
        dependsOn: [],
      },
      {
        name: 'domain-designer',
        level: 2,
        requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
        blocks: [],
        dependsOn: ['product-architect'],
      },
      {
        name: 'story-implementor',
        level: 3,
        requires: [{ path: 'docs/inception/example/H01-01/tdd_implementation_plan.md', required: true }],
        blocks: ['scripts/harness/example/**'],
        dependsOn: ['domain-designer'],
      },
    ];

    // Act
    const actual = sut.parse(raw);

    // Assert
    expect(actual.gates.map((gate) => gate.name.value)).toEqual([
      'product-architect',
      'domain-designer',
      'story-implementor',
    ]);
    expect(actual.graph.resolveAncestors(actual.gates[2]!.name).map((name) => name.value)).toEqual([
      'product-architect',
      'domain-designer',
    ]);
  });

  it('不正型の定義を拒否すること', () => {
    // Arrange
    const sut = new CustomGatesConfigParser();
    const act = () =>
      sut.parse([
        {
          name: 'domain-designer',
          level: 2,
          requires: 'docs/product/construction/example/domain_model.md',
          blocks: [],
          dependsOn: [],
        },
      ]);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateDefinitionError);
  });

  it('循環依存を含む定義を拒否すること', () => {
    // Arrange
    const sut = new CustomGatesConfigParser();
    const act = () =>
      sut.parse([
        {
          name: 'domain-designer',
          level: 2,
          requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
          blocks: [],
          dependsOn: ['logical-designer'],
        },
        {
          name: 'logical-designer',
          level: 2,
          requires: [{ path: 'docs/product/construction/example/logical_design.md', required: true }],
          blocks: [],
          dependsOn: ['domain-designer'],
        },
      ]);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
  });

  it('空配列を許容すること', () => {
    // Arrange
    const sut = new CustomGatesConfigParser();

    // Act
    const actual = sut.parse([]);

    // Assert
    expect(actual.gates).toEqual([]);
    expect(actual.graph.gates.size).toBe(0);
  });
});
