// @layer test
import { describe, expect, it } from 'vitest';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { GateDefinition, InvalidGateDefinitionError } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { GateName } from '../../../phase-dependency-model/domain/values/gate-name.js';
import { GateStoryAnnotation } from '../../../phase-dependency-model/domain/values/gate-story-annotation.js';

describe('GateDefinition', () => {
  it('raw 定義から GateDefinition を生成できること', () => {
    // Arrange
    const raw = {
      name: 'story-implementor',
      level: 3,
      requires: [{ path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md', required: true }],
      blocks: ['scripts/harness/**/*.ts'],
      dependsOn: ['scenario-test-logic-designer'],
      storyAnnotation: { required: true, tag: '@story-id' },
    };

    // Act
    const actual = GateDefinition.fromRaw(raw);

    // Assert
    expect(actual.name.equals(GateName.create('story-implementor'))).toBe(true);
    expect(actual.level.equals(PhaseLevel.create(3))).toBe(true);
    expect(actual.requires).toEqual([
      { path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md', required: true },
    ]);
    expect(actual.blocks).toEqual(['scripts/harness/**/*.ts']);
    expect(actual.dependsOn.map((gateName) => gateName.value)).toEqual([
      'scenario-test-logic-designer',
    ]);
    expect(actual.storyAnnotation?.equals(GateStoryAnnotation.create({ required: true, tag: '@story-id' }))).toBe(true);
  });

  it('storyAnnotation を持つ Level 2 ゲートを拒否すること', () => {
    // Arrange
    const act = (): GateDefinition =>
      GateDefinition.create({
        name: GateName.create('logical-designer'),
        level: PhaseLevel.create(2),
        requires: [],
        blocks: [],
        dependsOn: [],
        storyAnnotation: GateStoryAnnotation.create({ required: true, tag: '@story-id' }),
      });

    // Act
    const actual = act;

    // Assert
    expect(actual).toThrow(InvalidGateDefinitionError);
  });

  it('配列を readonly として凍結すること', () => {
    // Arrange
    const sut = GateDefinition.create({
      name: GateName.create('logical-designer'),
      level: PhaseLevel.create(2),
      requires: [{ path: 'docs/product/construction/{unit}/logical_design.md', required: true }],
      blocks: ['scripts/harness/**/*.ts'],
      dependsOn: [GateName.create('domain-designer')],
    });

    // Act
    const actual = sut;

    // Assert
    expect(Object.isFrozen(actual.requires)).toBe(true);
    expect(Object.isFrozen(actual.blocks)).toBe(true);
    expect(Object.isFrozen(actual.dependsOn)).toBe(true);
  });

  it('blocks が空配列でも生成できること', () => {
    // Arrange
    const input = {
      name: GateName.create('implementation-readiness-checker'),
      level: PhaseLevel.create(3),
      requires: [],
      blocks: [],
      dependsOn: [GateName.create('scenario-test-logic-designer')],
    };

    // Act
    const actual = GateDefinition.create(input);

    // Assert
    expect(actual.blocks).toEqual([]);
  });
});
