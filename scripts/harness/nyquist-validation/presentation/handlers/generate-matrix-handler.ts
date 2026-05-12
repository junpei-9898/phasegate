// @layer presentation
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-131

import type {
  GenerateRequirementTestMatrixInput,
  GenerateRequirementTestMatrixUseCase,
} from '../../application/usecases/generate-requirement-test-matrix-usecase.js';

export interface GenerateMatrixHandlerDeps {
  readonly useCase: GenerateRequirementTestMatrixUseCase;
}

export class GenerateMatrixHandler {
  private readonly useCase: GenerateRequirementTestMatrixUseCase;

  constructor(deps: GenerateMatrixHandlerDeps) {
    this.useCase = deps.useCase;
  }

  async handle(input: Omit<GenerateRequirementTestMatrixInput, 'write'>, flags: Record<string, boolean | string>): Promise<void> {
    const output = await this.useCase.execute({ ...input, write: true });
    if (flags.json === true) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }
    console.log(`Requirement test matrix generated: ${input.matrixFilePath}`);
    console.log(`Stories: ${output.matrix.stories.length}`);
    console.log(`Missing tests: ${output.report.missingTests.length}`);
    console.log(`Orphan tests: ${output.report.orphanTests.length}`);
    console.log(`Preserved references: ${output.report.preservedReferences}`);
  }
}
