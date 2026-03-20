/**
 * @layer presentation
 * @unit skill-quality
 */
import type { ValidateSkillStructureUseCase } from '../../application/usecases/validate-skill-structure-usecase.js';

export interface ValidateSkillStructureArgs {
  skillFile: string;
  format?: 'human' | 'json';
}

export class ValidateSkillStructureHandler {
  constructor(private readonly useCase: ValidateSkillStructureUseCase) {}

  async handle(args: ValidateSkillStructureArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const output = await this.useCase.execute({ skillFilePath: args.skillFile });
      const format = args.format ?? 'human';
      const result = output.result;

      if (format === 'json') {
        return { exitCode: result.passed ? 0 : 1, message: JSON.stringify(result, null, 2) };
      }

      if (result.passed) {
        return { exitCode: 0, message: 'Skill structure validation PASSED' };
      }

      const missing = result.missingSection.join(', ');
      return { exitCode: 1, message: `Skill structure validation FAILED\nMissing sections: ${missing}` };
    } catch (err) {
      return { exitCode: 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
