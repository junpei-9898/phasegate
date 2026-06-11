/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 * @work-item-id WI-212
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL3ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l3-validators-usecase.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { createLayerConfig, createFullRegistry } from '../helpers.js';

function createUseCaseForLanguages(projectLanguages: readonly string[]): RunL3ValidatorsUseCase {
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig('L3', { strictOnly: true })),
    getProjectLanguages: vi.fn().mockResolvedValue(projectLanguages),
  };

  return new RunL3ValidatorsUseCase({
    validatorRegistry: createFullRegistry(),
    validatorExecutionService: new ValidatorExecutionService({}),
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: new ValidationResultContractMapper(),
  });
}

target('RunL3ValidatorsUseCase language dispatch', () => {
  describe('execute: project.languages に応じて validator を dispatch する', () => {
    context('TypeScript を含まないプロジェクトの場合', () => {
      it('TypeScript 専用 validator を unsupported-language skip にすること', async () => {
        // Arrange
        const usecase = createUseCaseForLanguages(['python']);
        const input = { targetPaths: ['src/'] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toEqual(expect.arrayContaining([
          expect.objectContaining({
            validatorId: 'L3-001',
            skipped: false,
          }),
          expect.objectContaining({
            validatorId: 'L3-002',
            skipped: true,
            skipReason: expect.stringContaining('unsupported-language'),
          }),
          expect.objectContaining({
            validatorId: 'L3-003',
            skipped: true,
            skipReason: expect.stringContaining('unsupported-language'),
          }),
        ]));
      });
    });
  });
});
