/**
 * @layer application
 * @unit skill-quality
 */
import type { SkillStructureValidator } from '../../domain/services/skill-structure-validator.js';
import type { ValidateSkillStructureInput } from '../dto/validate-skill-structure-input.js';
import type { ValidateSkillStructureOutput } from '../dto/validate-skill-structure-output.js';

export class ValidateSkillStructureUseCase {
  constructor(private readonly skillStructureValidator: SkillStructureValidator) {}

  async execute(input: ValidateSkillStructureInput): Promise<ValidateSkillStructureOutput> {
    const result = await this.skillStructureValidator.validate(input.skillFilePath);
    return { result };
  }
}
