/**
 * @layer application
 * @unit traceability-model
 */

import type { MetadataValidationOutput } from '../dto/metadata-validation-output.js';
import type { DesignDocumentPort } from '../../domain/ports/design-document-port.js';
import type { MetadataValidator } from '../../domain/services/metadata-validator.js';
import type { MetadataValidationResult } from '../../domain/value-objects/metadata-validation-result.js';
import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

type DesignStoryAnnotationsValidator = Pick<
  MetadataValidator,
  'validateDesignDocument'
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

export class DesignDocumentReadApplicationError extends Error {
  readonly filePath: string;
  readonly cause: unknown;

  constructor(filePath: string, cause: unknown) {
    super(`design document read failed: ${filePath}`);
    this.name = 'DesignDocumentReadApplicationError';
    this.filePath = filePath;
    this.cause = cause;
  }
}

export interface ValidateDesignStoryAnnotationsUseCaseDeps {
  readonly designDocumentPort: DesignDocumentPort;
  readonly validator: DesignStoryAnnotationsValidator;
}

export class ValidateDesignStoryAnnotationsUseCase {
  private readonly designDocumentPort: DesignDocumentPort;
  private readonly validator: DesignStoryAnnotationsValidator;

  constructor(deps: ValidateDesignStoryAnnotationsUseCaseDeps) {
    this.designDocumentPort = deps.designDocumentPort;
    this.validator = deps.validator;
  }

  async execute(
    filePaths: readonly ProjectRelativePath[],
  ): Promise<readonly Readonly<MetadataValidationOutput>[]> {
    const results: Readonly<MetadataValidationOutput>[] = [];

    for (const filePath of filePaths) {
      try {
        if (typeof this.designDocumentPort.readFrontmatterFlags !== 'function') {
          throw new Error('readFrontmatterFlags is not implemented');
        }
        if (typeof this.designDocumentPort.readStoryAnnotations !== 'function') {
          throw new Error('readStoryAnnotations is not implemented');
        }

        const flags = await this.designDocumentPort.readFrontmatterFlags(filePath);
        const annotations = await this.designDocumentPort.readStoryAnnotations(filePath);
        const result = await this.validator.validateDesignDocument({
          documentPath: filePath,
          annotations,
          flags,
        });
        results.push(toOutput(filePath, result));
      } catch (error) {
        throw new DesignDocumentReadApplicationError(filePath.toString(), error);
      }
    }

    return Object.freeze(results);
  }
}
