/**
 * @layer presentation
 * @unit traceability-model
 */

import type { ValidateImplementationMetadataUseCase } from '../../application/usecases/validate-implementation-metadata-usecase.js';
import type { ValidateDesignStoryAnnotationsUseCase } from '../../application/usecases/validate-design-story-annotations-usecase.js';
import type { ValidateTestStoryMetadataUseCase } from '../../application/usecases/validate-test-story-metadata-usecase.js';
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
type ImplUseCase = Pick<ValidateImplementationMetadataUseCase, 'execute'>;
type DesignUseCase = Pick<ValidateDesignStoryAnnotationsUseCase, 'execute'>;
type TestUseCase = Pick<ValidateTestStoryMetadataUseCase, 'execute'>;

const DESIGN_DOCUMENT_EXTENSION = '.md';
const TEST_FILE_SUFFIXES = Object.freeze([
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
]);

export interface ValidateMetadataCommandHandlerDeps {
  readonly validateImplementationMetadataUseCase: ImplUseCase;
  readonly validateDesignStoryAnnotationsUseCase: DesignUseCase;
  readonly validateTestStoryMetadataUseCase?: TestUseCase;
  readonly createProjectRelativePath: PathFactory;
}

export class ValidateMetadataCommandHandler {
  private readonly implUseCase: ImplUseCase;
  private readonly designUseCase: DesignUseCase;
  private readonly testUseCase?: TestUseCase;
  private readonly createPath: PathFactory;

  constructor(deps: ValidateMetadataCommandHandlerDeps) {
    this.implUseCase = deps.validateImplementationMetadataUseCase;
    this.designUseCase = deps.validateDesignStoryAnnotationsUseCase;
    this.testUseCase = deps.validateTestStoryMetadataUseCase;
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
      const { designPaths, testPaths, implPaths } = this.classify(paths);

      const [designResults, testResults, implResults] = await Promise.all([
        designPaths.length > 0
          ? this.designUseCase.execute(designPaths)
          : Promise.resolve([] as readonly MetadataValidationOutput[]),
        testPaths.length > 0 && this.testUseCase
          ? this.testUseCase.execute(testPaths)
          : Promise.resolve([] as readonly MetadataValidationOutput[]),
        implPaths.length > 0
          ? this.implUseCase.execute(implPaths)
          : Promise.resolve([] as readonly MetadataValidationOutput[]),
      ]);

      const results = this.mergePreservingOrder(paths, [
        ...designResults,
        ...testResults,
        ...implResults,
      ]);

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

  private classify(paths: readonly ProjectRelativePath[]): {
    readonly designPaths: readonly ProjectRelativePath[];
    readonly testPaths: readonly ProjectRelativePath[];
    readonly implPaths: readonly ProjectRelativePath[];
  } {
    const designPaths: ProjectRelativePath[] = [];
    const testPaths: ProjectRelativePath[] = [];
    const implPaths: ProjectRelativePath[] = [];
    for (const path of paths) {
      if (path.extname() === DESIGN_DOCUMENT_EXTENSION) {
        designPaths.push(path);
      } else if (this.isTestFile(path) && this.testUseCase) {
        testPaths.push(path);
      } else {
        implPaths.push(path);
      }
    }
    return { designPaths, testPaths, implPaths };
  }

  private isTestFile(path: ProjectRelativePath): boolean {
    const value = path.toString();
    return TEST_FILE_SUFFIXES.some((suffix) => value.endsWith(suffix));
  }

  private mergePreservingOrder(
    orderedPaths: readonly ProjectRelativePath[],
    results: readonly MetadataValidationOutput[],
  ): readonly MetadataValidationOutput[] {
    const byPath = new Map<string, MetadataValidationOutput>();
    for (const result of results) {
      byPath.set(result.filePath, result);
    }
    const ordered: MetadataValidationOutput[] = [];
    for (const path of orderedPaths) {
      const result = byPath.get(path.toString());
      if (result) {
        ordered.push(result);
      }
    }
    return Object.freeze(ordered);
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
