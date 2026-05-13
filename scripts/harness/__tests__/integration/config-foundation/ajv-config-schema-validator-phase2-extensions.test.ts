// @layer test
// @unit config-foundation
// @story H04-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AjvConfigSchemaValidator } from '../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js';
import { createValidSourceDocument } from './config-foundation-test-fixtures.js';

function createPhase2ExtensionsDocument(evaluationMode: string, withArchitecture = false): Record<string, unknown> {
  const document = createValidSourceDocument() as unknown as Record<string, unknown>;
  if (withArchitecture) {
    document.architecture = { preset: 'clean' };
  }
  document.phase2Extensions = {
    initialCreationExpirationRules: [
      {
        ruleId: 'stale-initial-creation',
        documentPattern: 'docs/**/*.md',
        daysThreshold: 90,
        commitCountThreshold: 5,
        evaluationMode,
        enabled: true,
      },
    ],
  };
  return document;
}

target('AjvConfigSchemaValidator phase2Extensions contract (WI-170)', () => {
  describe('validate', () => {
    context('v2 document with initialCreationExpirationRules', () => {
      it('WI170-IT-001: 有効な初期作成期限ルールを受け付けること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createPhase2ExtensionsDocument('or');

        // Act
        const actual = validator.validate(document as never);

        // Assert
        expect(actual).toEqual([]);
      });

      it('WI170-IT-002: 未対応の evaluationMode をルール位置のエラーとして拒否すること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createPhase2ExtensionsDocument('xor');

        // Act
        const actual = validator.validate(document as never);

        // Assert
        expect(actual).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '/phase2Extensions/initialCreationExpirationRules/0/evaluationMode',
            }),
          ]),
        );
      });
    });

    context('v3 document with initialCreationExpirationRules', () => {
      it('WI170-IT-003: architecture キーを持つ v3 document でも同じ契約を受け付けること', () => {
        // Arrange
        const validator = new AjvConfigSchemaValidator();
        const document = createPhase2ExtensionsDocument('and', true);

        // Act
        const actual = validator.validate(document as never);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});
