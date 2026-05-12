/**
 * @layer test
 * @unit validator-system
 * @work-item-id WI-132 / WI-133 / WI-136 / WI-137 / WI-138
 * @story H08-01
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ContractTraceabilityCoverageService } from '../../../validator-system/domain/services/contract-traceability-coverage-service.js';
import type { ContractTraceabilityInput } from '../../../validator-system/domain/value-objects/contract-traceability-model.js';

const emptyInput = (): ContractTraceabilityInput => ({
  publicContracts: [],
  testObservations: [],
  errorContracts: [],
  stateMachines: [],
  traceabilitySlices: [],
});

target('ContractTraceabilityCoverageService', () => {
  describe('check()', () => {
    context('public contractにrequired behaviorがあるとき', () => {
      it('対応するtest observationがなければ不足としてreportすること', () => {
        // Arrange
        const sut = new ContractTraceabilityCoverageService();
        const input: ContractTraceabilityInput = {
          ...emptyInput(),
          publicContracts: [{
            id: 'cli.validate',
            kind: 'cli-command',
            sourcePath: 'docs/guide/cli-reference.md',
            requiredBehaviors: ['success', 'invalid-option'],
          }],
          testObservations: [{
            id: 'obs-1',
            kind: 'e2e',
            sourcePath: 'scripts/harness/__tests__/e2e/cli-harness.test.ts',
            covers: ['cli.validate:success'],
          }],
        };
        // Act
        const actual = sut.check(input);
        // Assert
        expect(actual.findings).toContainEqual(expect.objectContaining({
          kind: 'missing-required-behavior-test',
          subject: 'cli.validate',
        }));
      });
    });

    context('port contractがあるとき', () => {
      it('adapter contract test observationがなければreportすること', () => {
        // Arrange
        const sut = new ContractTraceabilityCoverageService();
        const input: ContractTraceabilityInput = {
          ...emptyInput(),
          publicContracts: [{
            id: 'port.DesignDocumentPort',
            kind: 'port',
            sourcePath: 'scripts/harness/validator-system/domain/ports/design-document-port.ts',
            requiredBehaviors: [],
          }],
        };
        // Act
        const actual = sut.check(input);
        // Assert
        expect(actual.findings).toContainEqual(expect.objectContaining({
          kind: 'missing-port-contract-test',
          subject: 'port.DesignDocumentPort',
        }));
      });
    });

    context('config option contractにboundary caseがあるとき', () => {
      it('missing requiredやinvalid enumのtest不足をreportすること', () => {
        // Arrange
        const sut = new ContractTraceabilityCoverageService();
        const input: ContractTraceabilityInput = {
          ...emptyInput(),
          publicContracts: [{
            id: 'config.layers.L4.enabled',
            kind: 'config-option',
            sourcePath: 'docs/product/environment_contract.md',
            requiredBehaviors: ['default'],
            boundaryCases: ['missing-required', 'invalid-enum'],
          }],
          testObservations: [{
            id: 'obs-default',
            kind: 'unit',
            sourcePath: 'config.test.ts',
            covers: ['config.layers.L4.enabled:default'],
          }],
        };
        // Act
        const actual = sut.check(input);
        // Assert
        expect(actual.findings.map((finding) => finding.kind)).toContain('missing-boundary-test');
        expect(actual.findings.map((finding) => finding.message).join('\n')).toContain('invalid-enum');
      });
    });

    context('error contractが不完全なとき', () => {
      it('shapeとexit codeとerror path test不足をreportすること', () => {
        // Arrange
        const sut = new ContractTraceabilityCoverageService();
        const input: ContractTraceabilityInput = {
          ...emptyInput(),
          errorContracts: [{
            id: 'HARNESS-PG-001',
            sourcePath: 'scripts/harness/harness-error/infrastructure/registry/default.ts',
            code: 'HARNESS-PG-001',
            severity: 'warning',
            message: 'phase gate failed',
            suggestion: 'fix it',
            exitCode: 1,
          }],
        };
        // Act
        const actual = sut.check(input);
        // Assert
        expect(actual.findings.map((finding) => finding.kind)).toEqual(expect.arrayContaining([
          'error-contract-shape',
          'error-contract-exit-code',
          'missing-error-path-test',
        ]));
      });
    });

    context('state machineにdocs/code不一致とterminal transitionがあるとき', () => {
      it('状態不一致、不正遷移、transition test不足をreportすること', () => {
        // Arrange
        const sut = new ContractTraceabilityCoverageService();
        const input: ContractTraceabilityInput = {
          ...emptyInput(),
          stateMachines: [{
            id: 'wi-status',
            sourcePath: 'docs/folder_management_rules.md',
            docsStates: ['drafted', 'reflected', 'implemented', 'tested'],
            codeStates: ['drafted', 'reflected', 'implemented', 'completed'],
            transitions: [{ from: 'drafted', to: 'reflected' }],
            terminalStates: ['tested'],
            invalidTransitions: [{ from: 'tested', to: 'drafted' }],
          }],
        };
        // Act
        const actual = sut.check(input);
        // Assert
        expect(actual.findings.map((finding) => finding.kind)).toEqual(expect.arrayContaining([
          'state-doc-code-mismatch',
          'state-invalid-terminal-transition',
          'missing-transition-test',
        ]));
      });
    });

    context('traceability sliceに不整合があるとき', () => {
      it('affects反映漏れ、test observation不一致、public docs同期漏れをreportすること', () => {
        // Arrange
        const sut = new ContractTraceabilityCoverageService();
        const input: ContractTraceabilityInput = {
          ...emptyInput(),
          traceabilitySlices: [{
            workItemId: 'WI-138',
            affectedUnits: ['validator-system', 'traceability-model'],
            productUnits: ['validator-system'],
            implementationWorkItemIds: ['WI-138'],
            testWorkItemIds: [],
            publicDocsChanged: true,
            contractChanged: false,
          }],
        };
        // Act
        const actual = sut.check(input);
        // Assert
        expect(actual.findings.map((finding) => finding.kind)).toEqual(expect.arrayContaining([
          'traceability-unit-mismatch',
          'traceability-test-mismatch',
          'public-doc-contract-sync',
        ]));
      });
    });
  });
});
