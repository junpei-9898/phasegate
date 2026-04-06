// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidateMetadataCommandHandler } from '../../../traceability-model/presentation/cli/validate-metadata-command-handler.js';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.js';
import type { MetadataValidationOutput } from '../../../traceability-model/application/dto/metadata-validation-output.js';

function createValidOutput(filePath: string): MetadataValidationOutput {
  return {
    filePath,
    valid: true,
    errors: [],
    warnings: [],
  };
}

function createInvalidOutput(filePath: string): MetadataValidationOutput {
  return {
    filePath,
    valid: false,
    errors: [
      {
        code: 'L2-001',
        severity: 'error',
        message: '@unit タグが欠落しています',
        suggestion: '@unit を追加してください',
      },
    ],
    warnings: [],
  };
}

target('ValidateMetadataCommandHandler', () => {
  describe('execute', () => {
    context('ファイルパスが空の場合', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const useCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: useCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({ filePaths: [] });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain('no file paths');
        expect(useCase.execute).not.toHaveBeenCalled();
      });
    });

    context('すべてのファイルが検証に合格する場合', () => {
      it('終了コード0を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.ts'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: useCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.results).toHaveLength(1);
        expect(actual.text).toContain('PASS');
      });
    });

    context('検証に失敗するファイルがある場合', () => {
      it('終了コード1を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue([
            createInvalidOutput('scripts/harness/bar.ts'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: useCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/bar.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.text).toContain('FAIL');
        expect(actual.text).toContain('@unit タグが欠落しています');
      });
    });

    context('JSON出力が指定された場合', () => {
      it('JSON形式でテキストを返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.ts'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: useCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.ts'],
          json: true,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        const parsed = JSON.parse(actual.text);
        expect(parsed.results).toBeDefined();
      });
    });

    context('ユースケースが例外をスローする場合', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const useCase = {
          execute: vi.fn().mockRejectedValue(new Error('unexpected')),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: useCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain('failed unexpectedly');
      });
    });
  });
});
