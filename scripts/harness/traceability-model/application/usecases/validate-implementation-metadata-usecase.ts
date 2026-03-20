/**
 * @layer application
 * @unit traceability-model
 */

import type { MetadataValidationOutput } from '../dto/metadata-validation-output.js';
import type { MetadataReaderPort } from '../../domain/ports/metadata-reader-port.js';
import type { MetadataValidator } from '../../domain/services/metadata-validator.js';
import type { MetadataValidationResult } from '../../domain/value-objects/metadata-validation-result.js';
import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

type ImplementationMetadataValidator = Pick<
  MetadataValidator,
  'validateImplementation'
>;

const toOutput = (
  filePath: ProjectRelativePath,
  result: MetadataValidationResult,
): Readonly<MetadataValidationOutput> =>
  Object.freeze({
    filePath: filePath.toString(),
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  });

export class MetadataReadApplicationError extends Error {
  readonly filePath: string;
  readonly cause: unknown;

  constructor(filePath: string, cause: unknown) {
    super(`implementation metadata read failed: ${filePath}`);
    this.name = 'MetadataReadApplicationError';
    this.filePath = filePath;
    this.cause = cause;
  }
}

export interface ValidateImplementationMetadataUseCaseDeps {
  readonly metadataReaderPort: MetadataReaderPort;
  readonly validator: ImplementationMetadataValidator;
}

export class ValidateImplementationMetadataUseCase {
  private readonly metadataReaderPort: MetadataReaderPort;
  private readonly validator: ImplementationMetadataValidator;

  constructor(deps: ValidateImplementationMetadataUseCaseDeps) {
    this.metadataReaderPort = deps.metadataReaderPort;
    this.validator = deps.validator;
  }

  async execute(
    filePaths: readonly ProjectRelativePath[],
  ): Promise<readonly Readonly<MetadataValidationOutput>[]> {
    const results: Readonly<MetadataValidationOutput>[] = [];

    for (const filePath of filePaths) {
      let tags;
      try {
        tags = await this.metadataReaderPort.readImplementationTags(filePath);
      } catch (error) {
        throw new MetadataReadApplicationError(filePath.toString(), error);
      }

      const result = await this.validator.validateImplementation({
        filePath,
        tags,
      });
      results.push(toOutput(filePath, result));
    }

    return Object.freeze(results);
  }
}
