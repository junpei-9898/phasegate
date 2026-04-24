/**
 * @layer application
 * @unit traceability-model
 */

import type { DesignDocumentPort } from "../../domain/ports/design-document-port.js";
import type { MetadataValidator } from "../../domain/services/metadata-validator.js";
import {
  MetadataValidationResult,
  type TraceabilityHarnessError,
} from "../../domain/value-objects/metadata-validation-result.js";
import type { ProjectRelativePath } from "../../domain/value-objects/project-relative-path.js";
import type { WorkItemFrontmatter } from "../../domain/value-objects/work-item-frontmatter.js";
import { WorkItemFrontmatterValidationError } from "../../domain/value-objects/work-item-frontmatter.js";
import type { MetadataValidationOutput } from "../dto/metadata-validation-output.js";

type DesignStoryAnnotationsValidator = Pick<MetadataValidator, "validateDesignDocument">;

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

const toWorkItemFrontmatterError = (error: WorkItemFrontmatterValidationError): TraceabilityHarnessError =>
  Object.freeze({
    code: "L2-002",
    severity: "error",
    message: error.message,
    suggestion: "WI frontmatter の id/type/severity/status 形式を確認してください",
    fix_example: `---
id: WI-001
type: story
severity: normal
status: drafted
---`,
  });

const mergeValidationResult = (
  additionalErrors: readonly TraceabilityHarnessError[],
  result: MetadataValidationResult,
): MetadataValidationResult => {
  if (additionalErrors.length === 0) {
    return result;
  }

  return MetadataValidationResult.failure({
    errors: Object.freeze([...additionalErrors, ...result.errors]),
    warnings: result.warnings,
  });
};

const STORY_ID_REQUIRED_MESSAGE = "@story-id は必須です";

const acceptWorkItemFrontmatterAsStoryTrace = (
  filePath: ProjectRelativePath,
  frontmatter: WorkItemFrontmatter | null,
  result: MetadataValidationResult,
): MetadataValidationResult => {
  const isWorkItemPath = /(?:^|\/)_cross\/WI-\d+(?:\/|$)/.test(filePath.toString());
  if (frontmatter === null && !isWorkItemPath) {
    return result;
  }

  const errors = result.errors.filter((error) => error.message !== STORY_ID_REQUIRED_MESSAGE);
  if (errors.length === result.errors.length) {
    return result;
  }
  if (errors.length === 0) {
    return MetadataValidationResult.success({ warnings: result.warnings });
  }
  return MetadataValidationResult.failure({ errors, warnings: result.warnings });
};

export class DesignDocumentReadApplicationError extends Error {
  readonly filePath: string;
  readonly cause: unknown;

  constructor(filePath: string, cause: unknown) {
    super(`design document read failed: ${filePath}`);
    this.name = "DesignDocumentReadApplicationError";
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

  async execute(filePaths: readonly ProjectRelativePath[]): Promise<readonly Readonly<MetadataValidationOutput>[]> {
    const results: Readonly<MetadataValidationOutput>[] = [];

    for (const filePath of filePaths) {
      try {
        if (typeof this.designDocumentPort.readFrontmatterFlags !== "function") {
          throw new Error("readFrontmatterFlags is not implemented");
        }
        if (typeof this.designDocumentPort.readStoryAnnotations !== "function") {
          throw new Error("readStoryAnnotations is not implemented");
        }

        const workItemFrontmatterErrors: TraceabilityHarnessError[] = [];
        let workItemFrontmatter: WorkItemFrontmatter | null = null;
        if (typeof this.designDocumentPort.readWorkItemFrontmatter === "function") {
          try {
            workItemFrontmatter = await this.designDocumentPort.readWorkItemFrontmatter(filePath);
          } catch (error) {
            if (error instanceof WorkItemFrontmatterValidationError) {
              workItemFrontmatterErrors.push(toWorkItemFrontmatterError(error));
            } else {
              throw error;
            }
          }
        }

        const flags = await this.designDocumentPort.readFrontmatterFlags(filePath);
        const annotations = await this.designDocumentPort.readStoryAnnotations(filePath);
        const result = await this.validator.validateDesignDocument({
          documentPath: filePath,
          annotations,
          flags,
        });
        const resultWithWorkItemTrace = acceptWorkItemFrontmatterAsStoryTrace(filePath, workItemFrontmatter, result);
        results.push(toOutput(filePath, mergeValidationResult(workItemFrontmatterErrors, resultWithWorkItemTrace)));
      } catch (error) {
        throw new DesignDocumentReadApplicationError(filePath.toString(), error);
      }
    }

    return Object.freeze(results);
  }
}
