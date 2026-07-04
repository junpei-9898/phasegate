// @layer test
// @unit validator-system
// @story H08-03
// @work-item-id WI-134, WI-135
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL4ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l4-validators-usecase.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { createFullRegistry, createLayerConfig } from '../helpers.js';

target('RunL4ValidatorsUseCase architecture semantic advisory', () => {
  describe('execute', () => {
    context('architecture semantic analysis が advisory を返す場合', () => {
      it('L4-002 の warning finding として統合される (WI-134, WI-135)', async () => {
        // Arrange
        const architectureAnalyze = vi.fn().mockResolvedValue([{
          code: { value: 'L4-002', toString: () => 'L4-002' },
          severity: { value: 'warning', toString: () => 'warning' },
          message: 'Decision placement advisory: business-rule-branch observed in presentation',
          suggestion: 'confidence=0.72; evidence=branch-count=4; suggested owner zone=domain; rollout=advisory',
        }]);
        const usecase = new RunL4ValidatorsUseCase({
          validatorRegistry: createFullRegistry(),
          validatorExecutionService: new ValidatorExecutionService({}),
          validatorConfigPort: {
            getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L4', { validatorIds: ['L4-002'] })),
          },
          contractMapper: new ValidationResultContractMapper(),
          consistencyCheckService: {
            check: vi.fn().mockResolvedValue({ hasMismatches: () => false, toHarnessErrors: () => [] }),
            checkWorkItemReflection: vi.fn().mockResolvedValue({
              report: { hasMismatches: () => false, toHarnessErrors: () => [] },
            }),
          } as never,
          architectureSemanticAnalysisService: { analyze: architectureAnalyze } as never,
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-002'] });

        // Assert
        expect(actual).toEqual([
          {
            validatorId: 'L4-002',
            passed: false,
            skipped: false,
            durationMs: 0,
            errors: [{
              code: 'L4-002',
              severity: 'warning',
              message: 'Decision placement advisory: business-rule-branch observed in presentation',
              suggestion: 'confidence=0.72; evidence=branch-count=4; suggested owner zone=domain; rollout=advisory',
            }],
          },
        ]);
      });
    });
  });
});
