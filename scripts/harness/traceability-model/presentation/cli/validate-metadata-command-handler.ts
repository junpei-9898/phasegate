/**
 * @layer presentation
 * @unit traceability-model
 */

import type { ValidateImplementationMetadataUseCase } from '../../application/usecases/validate-implementation-metadata-usecase.js';
import type { MetadataValidationOutput } from '../../application/dto/metadata-validation-output.js';
import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

export interface ValidateMetadataCommandInput {
  readonly filePaths: readonly string[];
  readonly json?: boolean;
}

export interface ValidateMetadataCommandOutput {
  readonly exitCode: 0 | 1 | 2;
  readonly results: readonly MetadataValidationOutput[];
  readonly text: string;
}

type PathFactory = (value: string) => ProjectRelativePath;

export interface ValidateMetadataCommandHandlerDeps {
  readonly validateImplementationMetadataUseCase: Pick<
    ValidateImplementationMetadataUseCase,
    'execute'
  >;
  readonly createProjectRelativePath: PathFactory;
}

export class ValidateMetadataCommandHandler {
  private readonly useCase: Pick<ValidateImplementationMetadataUseCase, 'execute'>;
  private readonly createPath: PathFactory;

  constructor(deps: ValidateMetadataCommandHandlerDeps) {
    this.useCase = deps.validateImplementationMetadataUseCase;
    this.createPath = deps.createProjectRelativePath;
  }

  async execute(
    input: ValidateMetadataCommandInput,
  ): Promise<Readonly<ValidateMetadataCommandOutput>> {
    if (input.filePaths.length === 0) {
      return Object.freeze({
        exitCode: 2,
        results: Object.freeze([]),
        text: 'Error: no file paths specified',
      });
    }

    try {
      const paths = input.filePaths.map((p) => this.createPath(p));
      const results = await this.useCase.execute(paths);
      const hasFailures = results.some((r) => !r.valid);
      const text = input.json
        ? JSON.stringify({ results }, null, 2)
        : this.formatText(results);

      return Object.freeze({
        exitCode: hasFailures ? 1 : 0,
        results,
        text,
      });
    } catch {
      return Object.freeze({
        exitCode: 2,
        results: Object.freeze([]),
        text: 'Error: metadata validation failed unexpectedly',
      });
    }
  }

  private formatText(results: readonly MetadataValidationOutput[]): string {
    const lines: string[] = [];
    for (const r of results) {
      const status = r.valid ? 'PASS' : 'FAIL';
      lines.push(`[${status}] ${r.filePath}`);
      for (const e of r.errors) {
        lines.push(`  ERROR: ${e.message}`);
      }
      for (const w of r.warnings) {
        lines.push(`  WARN: ${w.message}`);
      }
    }
    return lines.join('\n');
  }
}
