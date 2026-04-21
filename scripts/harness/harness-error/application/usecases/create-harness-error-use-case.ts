/**
 * @layer application
 * @unit harness-error
 *
 * 単一draftを HarnessErrorContract へ変換するUseCase
 */
import type { CreateHarnessErrorInput } from '../dto/create-harness-error-input.js';
import type { HarnessErrorContract } from '../dto/harness-error-contract.js';
import type { HarnessErrorContractMapper } from '../mappers/harness-error-contract-mapper.js';
import type { HarnessErrorFactory } from '../../domain/services/harness-error-factory.js';

export interface CreateHarnessErrorUseCaseDeps {
  readonly harnessErrorFactory: HarnessErrorFactory;
  readonly contractMapper: HarnessErrorContractMapper;
}

export class CreateHarnessErrorUseCase {
  private readonly harnessErrorFactory: HarnessErrorFactory;
  private readonly contractMapper: HarnessErrorContractMapper;

  constructor(deps: CreateHarnessErrorUseCaseDeps) {
    this.harnessErrorFactory = deps.harnessErrorFactory;
    this.contractMapper = deps.contractMapper;
  }

  async execute(
    input: CreateHarnessErrorInput
  ): Promise<Readonly<HarnessErrorContract>> {
    const harnessError = await this.harnessErrorFactory.create({
      code: input.code,
      message: input.message,
      suggestion: input.suggestion,
      validatorId: input.validatorId,
      requestedSeverity: input.severity,
      adrRef: input.adrRef,
      fixExample: input.fixExample,
      suggestedSkill: input.suggestedSkill,
      scaffoldCommand: input.scaffoldCommand,
      templatePath: input.templatePath,
    });

    return this.contractMapper.toReadonlyContract(harnessError);
  }
}
