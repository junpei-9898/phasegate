// @unit phase-dependency-model
// @layer infrastructure

import { expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { AjvConfigSchemaValidator } from '../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js';
import { createValidSourceDocument } from '../config-foundation/config-foundation-test-fixtures.js';

const createGateDocument = (overrides?: Record<string, unknown>) =>
  createValidSourceDocument({
    phaseDependencies: {
      preset: 'custom',
      override: false,
      customRules: [],
      gates: [
        {
          name: 'story-implementor',
          level: 3,
          requires: [
            {
              path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md',
              required: true,
            },
          ],
          blocks: ['scripts/harness/example/**'],
          dependsOn: ['scenario-test-logic-designer'],
          storyAnnotation: {
            required: true,
            tag: '@story-id',
          },
          ...overrides,
        },
      ],
    },
  } as never);

target('phaseDependencies.gates schema integration', () => {
  it('phaseDependencies.gates を含む config を受け付けること', () => {
    // Arrange
    const validator = new AjvConfigSchemaValidator();
    const document = createGateDocument();

    // Act
    const actual = validator.validate(document);

    // Assert
    expect(actual).toEqual([]);
  });

  it('storyAnnotation は Level 3 以外では拒否すること', () => {
    // Arrange
    const validator = new AjvConfigSchemaValidator();
    const document = createGateDocument({ level: 2 });

    // Act
    const actual = validator.validate(document);

    // Assert
    expect(actual.length).toBeGreaterThanOrEqual(1);
    expect(
      actual.some(
        (error) =>
          'path' in error &&
          typeof error.path === 'string' &&
          error.path.includes('/phaseDependencies/gates/0'),
      ),
    ).toBe(true);
  });

  it('未知フィールドを拒否すること', () => {
    // Arrange
    const validator = new AjvConfigSchemaValidator();
    const document = createGateDocument({ unknownField: true });

    // Act
    const actual = validator.validate(document);

    // Assert
    expect(actual.length).toBeGreaterThanOrEqual(1);
    expect(
      actual.some(
        (error) =>
          'path' in error &&
          error.path === '/phaseDependencies/gates/0/unknownField',
      ),
    ).toBe(true);
  });
});
