import { describe, expect, it } from 'vitest';
import { GateDefinition } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { GateName } from '../../../phase-dependency-model/domain/values/gate-name.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import {
  GateGraph,
  GateGraphValidationError,
} from '../../../phase-dependency-model/domain/services/gate-graph.js';

const createGateDefinition = (
  overrides: Partial<{
    name: string;
    level: number;
    dependsOn: readonly string[];
  }> = {},
): GateDefinition =>
  GateDefinition.create({
    name: GateName.create(overrides.name ?? 'domain-designer'),
    level: PhaseLevel.create(overrides.level ?? 2),
    requires: [],
    blocks: [],
    dependsOn: Object.freeze((overrides.dependsOn ?? []).map((name) => GateName.create(name))),
  });

describe('GateGraph', () => {
  it('自己ループを循環依存として検出すること', () => {
    // Arrange
    const gates = [createGateDefinition({ name: 'story-implementor', level: 3, dependsOn: ['story-implementor'] })];
    const act = (): GateGraph => GateGraph.build(gates);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
    expect(() => actual()).toThrow(/循環依存/);
  });

  it('2ノード循環を検出すること', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'logical-designer', level: 3, dependsOn: ['scenario-test-designer'] }),
      createGateDefinition({ name: 'scenario-test-designer', level: 3, dependsOn: ['logical-designer'] }),
    ];
    const act = (): GateGraph => GateGraph.build(gates);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
    expect(() => actual()).toThrow(/循環依存/);
  });

  it('長い循環依存を検出すること', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'gate-a', level: 1, dependsOn: ['gate-c'] }),
      createGateDefinition({ name: 'gate-b', level: 2, dependsOn: ['gate-a'] }),
      createGateDefinition({ name: 'gate-c', level: 3, dependsOn: ['gate-b'] }),
    ];
    const act = (): GateGraph => GateGraph.build(gates);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
    expect(() => actual()).toThrow(/循環依存/);
  });

  it('未知の dependsOn 参照を検出すること', () => {
    // Arrange
    const gates = [createGateDefinition({ name: 'story-implementor', level: 3, dependsOn: ['missing-gate'] })];
    const act = (): GateGraph => GateGraph.build(gates);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
    expect(() => actual()).toThrow(/未知の dependsOn/);
  });

  it('レベル逆行を検出すること', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'story-implementor', level: 1, dependsOn: ['logical-designer'] }),
      createGateDefinition({ name: 'logical-designer', level: 3 }),
    ];
    const act = (): GateGraph => GateGraph.build(gates);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
    expect(() => actual()).toThrow(/レベル逆行/);
  });

  it('重複するゲート名を検出すること', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'logical-designer', level: 2 }),
      createGateDefinition({ name: 'logical-designer', level: 3 }),
    ];
    const act = (): GateGraph => GateGraph.build(gates);

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(GateGraphValidationError);
    expect(() => actual()).toThrow(/重複する GateName/);
  });

  it('複数違反をまとめて報告すること', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'logical-designer', level: 1, dependsOn: ['missing-gate'] }),
      createGateDefinition({ name: 'logical-designer', level: 2 }),
      createGateDefinition({ name: 'story-implementor', level: 1, dependsOn: ['scenario-test-logic-designer'] }),
      createGateDefinition({ name: 'scenario-test-logic-designer', level: 3 }),
    ];

    // Act
    const actual = (() => {
      try {
        GateGraph.build(gates);
        return undefined;
      } catch (error) {
        return error;
      }
    })();

    // Assert
    expect(actual).toBeInstanceOf(GateGraphValidationError);
    expect((actual as GateGraphValidationError).violations).toHaveLength(3);
  });

  it('祖先ゲートをトポロジカル順で返すこと', () => {
    // Arrange
    const sut = GateGraph.build([
      createGateDefinition({ name: 'product-architect', level: 1 }),
      createGateDefinition({ name: 'domain-designer', level: 2, dependsOn: ['product-architect'] }),
      createGateDefinition({ name: 'logical-designer', level: 2, dependsOn: ['domain-designer'] }),
      createGateDefinition({
        name: 'story-implementor',
        level: 3,
        dependsOn: ['domain-designer', 'logical-designer'],
      }),
    ]);

    // Act
    const actual = sut.resolveAncestors(GateName.create('story-implementor'));

    // Assert
    expect(actual.map((gateName) => gateName.value)).toEqual([
      'product-architect',
      'domain-designer',
      'logical-designer',
    ]);
  });

  it('dependsOn が DAG を満たす複数チェーン合流構成で violations 空を返すこと', () => {
    // Arrange
    const gates = [
      createGateDefinition({ name: 'gate-a', level: 1 }),
      createGateDefinition({ name: 'gate-c', level: 1 }),
      createGateDefinition({ name: 'gate-b', level: 2, dependsOn: ['gate-a', 'gate-c'] }),
      createGateDefinition({ name: 'gate-d', level: 3, dependsOn: ['gate-b'] }),
    ];

    // Act
    const actual = GateGraph.build(gates);

    // Assert
    expect(actual).toBeInstanceOf(GateGraph);
  });
});
