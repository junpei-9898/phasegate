/**
 * @layer application
 * @unit harness-error
 *
 * HarnessErrorContract への投影Mapper
 */
import type { HarnessErrorContract } from '../dto/harness-error-contract.js';
import type { HarnessError } from '../../domain/value-objects/harness-error.js';

export class HarnessErrorContractMapper {
  toReadonlyContract(harnessError: HarnessError): Readonly<HarnessErrorContract> {
    const contract: HarnessErrorContract = {
      code: harnessError.code.toString(),
      severity: harnessError.severity.toString(),
      message: harnessError.message,
      suggestion: harnessError.suggestion,
      ...(harnessError.adrRef !== null
        ? { adr_ref: harnessError.adrRef.toString() }
        : {}),
      ...(harnessError.fixExample !== null
        ? { fix_example: harnessError.fixExample.toString() }
        : {}),
      ...(harnessError.suggestedSkill !== null
        ? { suggested_skill: harnessError.suggestedSkill }
        : {}),
      ...(harnessError.scaffoldCommand !== null
        ? { scaffold_command: harnessError.scaffoldCommand }
        : {}),
      ...(harnessError.templatePath !== null
        ? { template_path: harnessError.templatePath }
        : {}),
    };

    return Object.freeze(contract);
  }
}
