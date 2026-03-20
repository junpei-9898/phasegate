// @unit agent-integration
// @layer application
// @story H11-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HandlePreToolUseUseCase } from '../../../agent-integration/application/usecases/handle-pre-tool-use-usecase.js';

function createHandlePreToolUseUseCase(ports: {
  configQueryPort: {
    isHookEnabled: ReturnType<typeof vi.fn>;
    getProtectedFilePatterns: ReturnType<typeof vi.fn>;
  };
}) {
  return new HandlePreToolUseUseCase({ configQueryPort: ports.configQueryPort });
}

function buildPreToolUseInput(overrides: Partial<{
  toolName: string;
  targetFilePaths: string[];
}> = {}) {
  return {
    toolName: 'str_replace_editor',
    targetFilePaths: [],
    ...overrides,
  };
}

target('HandlePreToolUseUseCase.execute', () => {
  describe('保護ファイルリストへのアクセス制御を行う', () => {
    context('biome.json（デフォルト保護対象）が変更対象の場合', () => {
      // IT-UC-HandlePreToolUse-001
      it('保護対象ファイル（biome.json）への変更がブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('biome.json');
      });
    });

    context('tsconfig.json（デフォルト保護対象）が変更対象の場合', () => {
      // IT-UC-HandlePreToolUse-002
      it('保護対象ファイル（tsconfig.json）への変更がブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['tsconfig.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('tsconfig.json');
      });
    });

    context('保護対象外ファイルが変更対象の場合', () => {
      // IT-UC-HandlePreToolUse-003
      it('保護対象外ファイルへの変更は通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['src/index.ts'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.blockedFilePath).toBeUndefined();
      });
    });

    context('カスタム追加パターンが設定されている場合', () => {
      // IT-UC-HandlePreToolUse-004
      it('カスタム追加パターンに一致するファイルがブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue(['custom-protected.json']),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['custom-protected.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('custom-protected.json');
      });
    });

    context('複数ファイルパスのうち1件が保護対象の場合', () => {
      // IT-UC-HandlePreToolUse-005
      it('複数パスのうち1件でも保護対象に一致すればブロックされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['src/index.ts', 'package.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('package.json');
      });
    });

    context('toolNameが空文字の場合', () => {
      // IT-UC-HandlePreToolUse-006
      it('toolNameが空文字の場合、入力バリデーションエラーになること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn(),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: '', targetFilePaths: ['src/index.ts'] });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow();
      });
    });

    context('targetFilePathsが空配列の場合', () => {
      // IT-UC-HandlePreToolUse-007
      it('targetFilePathsが空配列の場合、ブロックなしで通過すること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: [] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(false);
      });
    });

    context('biome.json ブロック時のエラーメッセージ', () => {
      // IT-UC-HandlePreToolUse-008
      it('biome.jsonブロック時、result.error.messageにブロックされたファイル名が含まれること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = createHandlePreToolUseUseCase({ configQueryPort: mockConfigQueryPort });
        const input = buildPreToolUseInput({ toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.shouldBlock).toBe(true);
        const errorText = JSON.stringify(actual.error ?? actual);
        expect(errorText).toContain('biome.json');
      });
    });
  });
});
