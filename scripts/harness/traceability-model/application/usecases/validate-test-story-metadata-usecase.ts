/**
 * @layer application
 * @unit traceability-model
 */

import type { MetadataValidationOutput } from '../dto/metadata-validation-output.js';
import type { MetadataReaderPort } from '../../domain/ports/metadata-reader-port.js';
import type { MetadataValidator } from '../../domain/services/metadata-validator.js';
import type { MetadataValidationResult } from '../../domain/value-objects/metadata-validation-result.js';
import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

type TestStoryMetadataValidator = Pick<MetadataValidator, 'validateTest'>;

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
    super(`test metadata read failed: ${filePath}`);
    this.name = 'MetadataReadApplicationError';
    this.filePath = filePath;
    this.cause = cause;
  }
}

export interface ValidateTestStoryMetadataUseCaseDeps {
  readonly metadataReaderPort: MetadataReaderPort;
  readonly validator: TestStoryMetadataValidator;
}

export class ValidateTestStoryMetadataUseCase {
  private readonly metadataReaderPort: MetadataReaderPort;
  private readonly validator: TestStoryMetadataValidator;

  constructor(deps: ValidateTestStoryMetadataUseCaseDeps) {
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
        if (typeof this.metadataReaderPort.readTestTags !== 'function') {
          throw new Error('readTestTags is not implemented');
        }
        tags = await this.metadataReaderPort.readTestTags(filePath);
      } catch (error) {
        throw new MetadataReadApplicationError(filePath.toString(), error);
      }

      const result = await this.validator.validateTest({
        filePath,
        tags,
      });
      results.push(toOutput(filePath, result));
    }

    return Object.freeze(results);
  }
}
