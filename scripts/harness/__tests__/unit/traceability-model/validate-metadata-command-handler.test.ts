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

function createInvalidDesignOutput(filePath: string): MetadataValidationOutput {
  return {
    filePath,
    valid: false,
    errors: [
      {
        code: 'L2-002',
        severity: 'error',
        message: '@story-id は必須です',
        suggestion: '設計文書の対象ストーリーを注釈してください',
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
        const implUseCase = { execute: vi.fn() };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({ filePaths: [] });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain('no file paths');
        expect(implUseCase.execute).not.toHaveBeenCalled();
        expect(designUseCase.execute).not.toHaveBeenCalled();
      });
    });

    context('すべてのファイルが検証に合格する場合', () => {
      it('終了コード0を返すこと', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.ts'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
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
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createInvalidOutput('scripts/harness/bar.ts'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
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
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.ts'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
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
        const implUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('unexpected')),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
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

    context('.mdファイルが与えられた場合', () => {
      it('designStoryAnnotationsUseCaseのみが呼ばれること', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('docs/product/construction/foo/logical_design.md'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['docs/product/construction/foo/logical_design.md'],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(designUseCase.execute).toHaveBeenCalledOnce();
        expect(implUseCase.execute).not.toHaveBeenCalled();
      });
    });

    context('.tsファイルが与えられた場合', () => {
      it('implementationUseCaseのみが呼ばれること', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.ts'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(implUseCase.execute).toHaveBeenCalledOnce();
        expect(designUseCase.execute).not.toHaveBeenCalled();
      });
    });

    context('.mdと.tsが混在した場合', () => {
      it('両方のUseCaseが呼ばれ結果がマージされること', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/b.ts'),
          ]),
        };
        const designUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('docs/product/a.md'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['docs/product/a.md', 'scripts/harness/b.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.results).toHaveLength(2);
        const paths = actual.results.map((r) => r.filePath);
        expect(paths).toContain('docs/product/a.md');
        expect(paths).toContain('scripts/harness/b.ts');
      });
    });

    context('designUseCaseがFAILを返す場合', () => {
      it('終了コード1と@story-idエラーメッセージを返すこと', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = {
          execute: vi.fn().mockResolvedValue([
            createInvalidDesignOutput('docs/product/construction/foo/domain_model.md'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['docs/product/construction/foo/domain_model.md'],
        });

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.text).toContain('FAIL');
        expect(actual.text).toContain('@story-id は必須です');
      });
    });

    context('designUseCaseが例外をスローする場合', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('design read failed')),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['docs/product/design.md'],
        });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain('failed unexpectedly');
      });
    });

    context('未知拡張子が与えられた場合', () => {
      it('implementationUseCaseにフォールバックされること', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('docs/notes/foo.txt'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        await handler.execute({ filePaths: ['docs/notes/foo.txt'] });

        // Assert
        expect(implUseCase.execute).toHaveBeenCalledOnce();
        expect(designUseCase.execute).not.toHaveBeenCalled();
      });
    });

    context('.mdと.tsが入れ替わり順で与えられた場合', () => {
      it('結果が入力順を保持すること', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/b.ts'),
          ]),
        };
        const designUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('docs/product/a.md'),
            createValidOutput('docs/product/c.md'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: [
            'docs/product/a.md',
            'scripts/harness/b.ts',
            'docs/product/c.md',
          ],
        });

        // Assert
        expect(actual.results).toHaveLength(3);
        expect(actual.results[0].filePath).toBe('docs/product/a.md');
        expect(actual.results[1].filePath).toBe('scripts/harness/b.ts');
        expect(actual.results[2].filePath).toBe('docs/product/c.md');
      });
    });

    context('.test.ts ファイルが与えられ testUseCase が wiring されている場合 (UT-VMC-13)', () => {
      it('testUseCase に dispatch されること', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = { execute: vi.fn() };
        const testUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.test.ts'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          validateTestStoryMetadataUseCase: testUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.test.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(testUseCase.execute).toHaveBeenCalledOnce();
        expect(implUseCase.execute).not.toHaveBeenCalled();
        expect(designUseCase.execute).not.toHaveBeenCalled();
      });
    });

    context('.spec.ts ファイルが与えられた場合 (UT-VMC-14)', () => {
      it('testUseCase に dispatch されること', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = { execute: vi.fn() };
        const testUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/bar.spec.ts'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          validateTestStoryMetadataUseCase: testUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        await handler.execute({
          filePaths: ['scripts/harness/bar.spec.ts'],
        });

        // Assert
        expect(testUseCase.execute).toHaveBeenCalledOnce();
        expect(implUseCase.execute).not.toHaveBeenCalled();
      });
    });

    context('testUseCase が未配線で .test.ts が渡された場合 (UT-VMC-15)', () => {
      it('implUseCase にフォールバックして後方互換を保つこと', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.test.ts'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          // validateTestStoryMetadataUseCase: 意図的に未指定
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        await handler.execute({
          filePaths: ['scripts/harness/foo.test.ts'],
        });

        // Assert
        expect(implUseCase.execute).toHaveBeenCalledOnce();
      });
    });

    context('.md / .test.ts / .ts の3種混在 (UT-VMC-16)', () => {
      it('3 UseCase が並行呼び出しされ、結果が入力順を保持すること', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/impl.ts'),
          ]),
        };
        const designUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('docs/product/design.md'),
          ]),
        };
        const testUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/foo.test.ts'),
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          validateTestStoryMetadataUseCase: testUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: [
            'docs/product/design.md',
            'scripts/harness/foo.test.ts',
            'scripts/harness/impl.ts',
          ],
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.results).toHaveLength(3);
        expect(actual.results[0].filePath).toBe('docs/product/design.md');
        expect(actual.results[1].filePath).toBe('scripts/harness/foo.test.ts');
        expect(actual.results[2].filePath).toBe('scripts/harness/impl.ts');
      });
    });

    context('testUseCase が FAIL を返す場合 (UT-VMC-17)', () => {
      it('終了コード1 と @story 欠落エラーを返すこと', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = { execute: vi.fn() };
        const testUseCase = {
          execute: vi.fn().mockResolvedValue([
            {
              filePath: 'scripts/harness/foo.test.ts',
              valid: false,
              errors: [
                {
                  code: 'L2-002',
                  severity: 'error',
                  message: '@story タグが欠落しています',
                  suggestion: '// @story HXX-XX を付与してください',
                },
              ],
              warnings: [],
            },
          ]),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          validateTestStoryMetadataUseCase: testUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.test.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.text).toContain('@story タグが欠落しています');
      });
    });

    context('testUseCase が例外をスローする場合 (UT-VMC-18)', () => {
      it('終了コード2を返すこと', async () => {
        // Arrange
        const implUseCase = { execute: vi.fn() };
        const designUseCase = { execute: vi.fn() };
        const testUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('test metadata read failed')),
        };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          validateTestStoryMetadataUseCase: testUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        const actual = await handler.execute({
          filePaths: ['scripts/harness/foo.test.ts'],
        });

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.text).toContain('failed unexpectedly');
      });
    });

    context('テストヘルパー (scripts/harness/__tests__/helpers/foo.ts) が渡された場合 (UT-VMC-19)', () => {
      it('`.test.ts` サフィックスを持たないため implUseCase にルーティングされること', async () => {
        // Arrange
        const implUseCase = {
          execute: vi.fn().mockResolvedValue([
            createValidOutput('scripts/harness/__tests__/helpers/foo.ts'),
          ]),
        };
        const designUseCase = { execute: vi.fn() };
        const testUseCase = { execute: vi.fn() };
        const handler = new ValidateMetadataCommandHandler({
          validateImplementationMetadataUseCase: implUseCase,
          validateDesignStoryAnnotationsUseCase: designUseCase,
          validateTestStoryMetadataUseCase: testUseCase,
          createProjectRelativePath: (v: string) => ProjectRelativePath.create(v),
        });

        // Act
        await handler.execute({
          filePaths: ['scripts/harness/__tests__/helpers/foo.ts'],
        });

        // Assert
        expect(implUseCase.execute).toHaveBeenCalledOnce();
        expect(testUseCase.execute).not.toHaveBeenCalled();
      });
    });
  });
});
