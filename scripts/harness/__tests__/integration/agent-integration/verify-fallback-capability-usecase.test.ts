// @unit agent-integration
// @layer application
// @story H11-01

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { VerifyFallbackCapabilityUseCase } from '../../../agent-integration/application/usecases/verify-fallback-capability-usecase.js';
import { FallbackCapabilityViolationError } from '../../../agent-integration/domain/value-objects/fallback-capability-spec.js';

// ヘルパー: UseCase生成
function createVerifyFallbackUseCase(ports: {
  importAnalyzerPort: { analyzeAgentApiImports: ReturnType<typeof vi.fn> };
  cliCommandRegistryPort: { hasCommand: ReturnType<typeof vi.fn>; listCommands: ReturnType<typeof vi.fn> };
}) {
  return new VerifyFallbackCapabilityUseCase(ports);
}

function buildVerifyFallbackInput(overrides: Partial<{
  supportedCommands: string[];
  noAgentApiImports: boolean;
  targetFilePaths: string[];
}> = {}) {
  return {
    supportedCommands: ['harness:lint'],
    noAgentApiImports: true,
    ...overrides,
  };
}

target('VerifyFallbackCapabilityUseCase.execute', () => {
  describe('フォールバック仕様の検証を行う', () => {
    context('全コマンドが登録済みかつAgentAPI importなしの場合', () => {
      // IT-UC-VerifyFallback-001
      it('フォールバック仕様が全て有効な場合、検証が成功すること', async () => {
        // Arrange
        const mockImportAnalyzerPort = { analyzeAgentApiImports: vi.fn() };
        const mockCliCommandRegistryPort = { hasCommand: vi.fn(), listCommands: vi.fn() };
        mockImportAnalyzerPort.analyzeAgentApiImports.mockResolvedValue([
          { filePath: 'src/index.ts', agentApiImports: [] },
        ]);
        mockCliCommandRegistryPort.hasCommand.mockResolvedValue(true);
        const useCase = createVerifyFallbackUseCase({
          importAnalyzerPort: mockImportAnalyzerPort,
          cliCommandRegistryPort: mockCliCommandRegistryPort,
        });
        const input = buildVerifyFallbackInput({
          supportedCommands: ['harness:lint', 'harness:complete-check'],
          noAgentApiImports: true,
          targetFilePaths: ['src/index.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isValid).toBe(true);
        expect(actual.violations).toHaveLength(0);
        expect(actual.spec).toBeDefined();
      });
    });

    context('noAgentApiImports=falseの場合', () => {
      // IT-UC-VerifyFallback-002
      it('noAgentApiImports=falseの場合、ImportAnalyzer解析をスキップして成功すること', async () => {
        // Arrange
        const mockImportAnalyzerPort = { analyzeAgentApiImports: vi.fn() };
        const mockCliCommandRegistryPort = { hasCommand: vi.fn(), listCommands: vi.fn() };
        mockCliCommandRegistryPort.hasCommand.mockResolvedValue(true);
        const useCase = createVerifyFallbackUseCase({
          importAnalyzerPort: mockImportAnalyzerPort,
          cliCommandRegistryPort: mockCliCommandRegistryPort,
        });
        const input = buildVerifyFallbackInput({
          supportedCommands: ['harness:lint'],
          noAgentApiImports: false,
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isValid).toBe(true);
        expect(actual.violations).toHaveLength(0);
        expect(mockImportAnalyzerPort.analyzeAgentApiImports).not.toHaveBeenCalled();
      });
    });

    context('targetFilePathsが未指定の場合', () => {
      // IT-UC-VerifyFallback-003
      it('targetFilePathsが未指定の場合、デフォルトのコアモジュールパスで検証が成功すること', async () => {
        // Arrange
        const mockImportAnalyzerPort = { analyzeAgentApiImports: vi.fn() };
        const mockCliCommandRegistryPort = { hasCommand: vi.fn(), listCommands: vi.fn() };
        mockImportAnalyzerPort.analyzeAgentApiImports.mockResolvedValue([]);
        mockCliCommandRegistryPort.hasCommand.mockResolvedValue(true);
        const useCase = createVerifyFallbackUseCase({
          importAnalyzerPort: mockImportAnalyzerPort,
          cliCommandRegistryPort: mockCliCommandRegistryPort,
        });
        const input = buildVerifyFallbackInput({
          supportedCommands: ['harness:lint'],
          noAgentApiImports: true,
          // targetFilePaths 省略
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isValid).toBe(true);
        expect(actual.violations).toHaveLength(0);
      });
    });

    context('エージェント固有APIのimportが検出された場合', () => {
      // IT-UC-VerifyFallback-004
      it('エージェント固有APIのimportが検出された場合、violations付きで失敗すること', async () => {
        // Arrange
        const mockImportAnalyzerPort = { analyzeAgentApiImports: vi.fn() };
        const mockCliCommandRegistryPort = { hasCommand: vi.fn(), listCommands: vi.fn() };
        mockImportAnalyzerPort.analyzeAgentApiImports.mockResolvedValue([
          { filePath: 'src/agent.ts', agentApiImports: ['@anthropic-ai/claude-code'] },
        ]);
        mockCliCommandRegistryPort.hasCommand.mockResolvedValue(true);
        const useCase = createVerifyFallbackUseCase({
          importAnalyzerPort: mockImportAnalyzerPort,
          cliCommandRegistryPort: mockCliCommandRegistryPort,
        });
        const input = buildVerifyFallbackInput({
          supportedCommands: ['harness:lint'],
          noAgentApiImports: true,
          targetFilePaths: ['src/agent.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isValid).toBe(false);
        expect(actual.violations).toHaveLength(1);
        expect(actual.violations[0]).toMatchObject({ name: expect.any(String) });
      });
    });

    context('未登録コマンドが指定された場合', () => {
      // IT-UC-VerifyFallback-005
      it('未登録コマンドが指定された場合、violations付きで失敗すること', async () => {
        // Arrange
        const mockImportAnalyzerPort = { analyzeAgentApiImports: vi.fn() };
        const mockCliCommandRegistryPort = { hasCommand: vi.fn(), listCommands: vi.fn() };
        mockCliCommandRegistryPort.hasCommand.mockImplementation(
          async (cmd: string) => cmd === 'harness:lint',
        );
        const useCase = createVerifyFallbackUseCase({
          importAnalyzerPort: mockImportAnalyzerPort,
          cliCommandRegistryPort: mockCliCommandRegistryPort,
        });
        const input = buildVerifyFallbackInput({
          supportedCommands: ['harness:lint', 'harness:unknown-cmd'],
          noAgentApiImports: false,
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isValid).toBe(false);
        expect(actual.violations.length).toBeGreaterThanOrEqual(1);
      });
    });

    context('supportedCommandsが空の場合', () => {
      // IT-UC-VerifyFallback-006
      it('supportedCommandsが空の場合、FallbackCapabilityViolationErrorがスローされること', async () => {
        // Arrange
        const mockImportAnalyzerPort = { analyzeAgentApiImports: vi.fn() };
        const mockCliCommandRegistryPort = { hasCommand: vi.fn(), listCommands: vi.fn() };
        const useCase = createVerifyFallbackUseCase({
          importAnalyzerPort: mockImportAnalyzerPort,
          cliCommandRegistryPort: mockCliCommandRegistryPort,
        });
        const input = buildVerifyFallbackInput({
          supportedCommands: [],
          noAgentApiImports: false,
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(FallbackCapabilityViolationError);
      });
    });
  });
});
