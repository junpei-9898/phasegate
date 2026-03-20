# ITテストロジック設計: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **対応ストーリー**: H11-01, H11-02, H11-03, H11-04
> **参照文書**:
> - `docs/product/construction/agent-integration/it_test_design.md`
> - `docs/inception/agent-integration/it_test_logic_plan.md`
> - `docs/principles/testing-rules.md`

---

## 1. テストファイル構成

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/agent-integration/verify-fallback-capability-usecase.test.ts` | VerifyFallbackCapabilityUseCase | 6 |
| `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts` | HandlePreToolUseUseCase | 8 |
| `scripts/harness/__tests__/integration/agent-integration/handle-post-tool-use-usecase.test.ts` | HandlePostToolUseUseCase | 6 |
| `scripts/harness/__tests__/integration/agent-integration/handle-stop-usecase.test.ts` | HandleStopUseCase | 7 |
| `scripts/harness/__tests__/integration/agent-integration/env-file-reentry-guard-state-adapter.test.ts` | EnvFileReentryGuardStateAdapter | 10 |
| `scripts/harness/__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts` | HarnessConfigConfigQueryAdapter | 6 |
| `scripts/harness/__tests__/integration/agent-integration/harness-api-cli-command-registry-adapter.test.ts` | HarnessApiCliCommandRegistryAdapter | 4 |
| `scripts/harness/__tests__/integration/agent-integration/ts-morph-import-analyzer-adapter.test.ts` | TsMorphImportAnalyzerAdapter | 5 |
| `scripts/harness/__tests__/integration/agent-integration/child-process-cli-executor-adapter.test.ts` | ChildProcessCliExecutorAdapter | 5 |
| `scripts/harness/__tests__/integration/agent-integration/hook/pre-tool-use-hook.test.ts` | pre-tool-use-hook.ts | 7 |
| `scripts/harness/__tests__/integration/agent-integration/hook/post-tool-use-hook.test.ts` | post-tool-use-hook.ts | 7 |
| `scripts/harness/__tests__/integration/agent-integration/hook/stop-hook.test.ts` | stop-hook.ts | 7 |
| `scripts/harness/__tests__/integration/agent-integration/hook-flow-integration.test.ts` | Hook Flow Integration | 5 |

---

## 2. テストヘルパー・シードデータ

### 2.1 共通ファクトリ・ヘルパー

- `buildVerifyFallbackInput(overrides?)`: `VerifyFallbackCapabilityInput` の正常系初期値を返す。
- `buildPreToolUseInput(overrides?)`: `HandlePreToolUseInput` の初期値を返す。`toolName: 'str_replace_editor'`, `targetFilePaths: []` がデフォルト。
- `buildPostToolUseInput(overrides?)`: `HandlePostToolUseInput` の初期値を返す。`toolName: 'str_replace_editor'`, `affectedFilePaths: ['src/index.ts']` がデフォルト。
- `buildHandleStopInput(overrides?)`: `HandleStopInput` の初期値を返す。`sessionId: 'session-001'` がデフォルト。
- `createVerifyFallbackUseCase(ports)`: `FallbackCapabilitySpec`・`FallbackVerificationService` 実体 + モックポートで UseCase を生成する。
- `createHandlePreToolUseUseCase(ports)`: `ProtectedFileList`・`HookToCliTranslator` 実体 + モックポートで UseCase を生成する。
- `createHandlePostToolUseUseCase(ports)`: `HookToCliTranslator` 実体 + モックポートで UseCase を生成する。
- `createHandleStopUseCase(ports)`: `ReentryGuard`・`HookToCliTranslator` 実体 + モックポートで UseCase を生成する。

### 2.2 Portモックパターン

```typescript
// UseCase テスト共通 Port モック
const mockImportAnalyzerPort = {
  analyzeAgentApiImports: vi.fn(),
};
const mockCliCommandRegistryPort = {
  hasCommand: vi.fn(),
  listCommands: vi.fn(),
};
const mockConfigQueryPort = {
  isHookEnabled: vi.fn(),
  getProtectedFilePatterns: vi.fn(),
};
const mockCliExecutorPort = {
  execute: vi.fn(),
};
const mockReentryGuardStatePort = {
  readActive: vi.fn(),
  writeActive: vi.fn(),
  clearActive: vi.fn(),
};
```

### 2.3 fixtureファイル一覧

フィクスチャ配置先: `scripts/harness/__tests__/integration/agent-integration/fixtures/`

| ファイル名 | 用途 | 内容 |
|---|---|---|
| `harness-config-enabled.json` | ConfigQueryAdapter テスト（Hook有効設定） | `harnesses: { cascadeUpdate: true, agentLessonCollection: true }` を含む最小 HarnessConfigV2 |
| `harness-config-disabled.json` | ConfigQueryAdapter テスト（Hook無効設定） | `harnesses: { cascadeUpdate: false, agentLessonCollection: false }` を含む最小 HarnessConfigV2 |
| `no-agent-api.ts` | TsMorphImportAnalyzerAdapter テスト（エージェントAPIなし） | `import { readFile } from 'node:fs/promises'` のみを含む TypeScript ファイル |
| `with-agent-api.ts` | TsMorphImportAnalyzerAdapter テスト（エージェントAPIあり） | `import { query } from '@anthropic-ai/claude-code'` を含む TypeScript ファイル |
| `mock-cli-exit-0.ts` | ChildProcessCliExecutorAdapter テスト（成功） | `process.exit(0)` のみのモック CLI スクリプト |
| `mock-cli-exit-1.ts` | ChildProcessCliExecutorAdapter テスト（Lint 失敗） | `process.exit(1)` のみのモック CLI スクリプト |
| `mock-cli-slow.ts` | ChildProcessCliExecutorAdapter タイムアウトテスト | 1000ms 待機後に `process.exit(0)` するモック CLI スクリプト |

---

## 3. UseCaseテスト詳細ロジック

### 3.1 VerifyFallbackCapabilityUseCase（6件）

```typescript
// @unit agent-integration
// @layer application
// @story H11-01

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
        expect(actual.violations[0]).toMatchObject({ code: expect.any(String) });
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
        await expect(useCase.execute(input)).rejects.toThrow(
          expect.objectContaining({ name: 'FallbackCapabilityViolationError' }),
        );
      });
    });
  });
});
```

### 3.2 HandlePreToolUseUseCase（8件）

```typescript
// @unit agent-integration
// @layer application
// @story H11-02

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: ['biome.json'],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: ['tsconfig.json'],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: ['src/index.ts'],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: ['custom-protected.json'],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: ['src/index.ts', 'package.json'],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: '',
          targetFilePaths: ['src/index.ts'],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: [],
        });

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
        const useCase = createHandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });
        const input = buildPreToolUseInput({
          toolName: 'str_replace_editor',
          targetFilePaths: ['biome.json'],
        });

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
```

### 3.3 HandlePostToolUseUseCase（6件）

```typescript
// @unit agent-integration
// @layer application
// @story H11-03

target('HandlePostToolUseUseCase.execute', () => {
  describe('PostToolUse Hook の CLI 実行制御を行う', () => {
    context('Hook 有効かつ CLI が正常終了する場合', () => {
      // IT-UC-HandlePostToolUse-001
      it('PostToolUse Hookが有効な場合、harness:lint --fastが実行されること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false }),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({
          toolName: 'str_replace_editor',
          affectedFilePaths: ['src/index.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.skipReason).toBeUndefined();
        expect(actual.cliResult?.exitCode).toBe(0);
      });
    });

    context('Lint が失敗した場合（exitCode=1）', () => {
      // IT-UC-HandlePostToolUse-002
      it('Lintが失敗した場合（exitCode=1）、executed=trueでcliResult.exitCode=1が返ること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 1, timedOut: false }),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({
          toolName: 'str_replace_editor',
          affectedFilePaths: ['src/bad.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.cliResult?.exitCode).toBe(1);
      });
    });

    context('Hook 無効設定の場合', () => {
      // IT-UC-HandlePostToolUse-003
      it('Hook無効設定の場合、HOOK_DISABLEDでスキップされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(false),
          getProtectedFilePatterns: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({
          toolName: 'str_replace_editor',
          affectedFilePaths: ['src/index.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('HOOK_DISABLED');
      });
    });

    context('タイムアウト超過の場合', () => {
      // IT-UC-HandlePostToolUse-004
      it('タイムアウト超過（500ms以上）の場合、TIMEOUT_EXCEEDEDでスキップされること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { timedOut: true })),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({
          toolName: 'str_replace_editor',
          affectedFilePaths: ['src/index.ts'],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('TIMEOUT_EXCEEDED');
      });
    });

    context('CliExecutorPort が実行エラーをスローした場合', () => {
      // IT-UC-HandlePostToolUse-005
      it('CliExecutorPortが実行エラーをthrowした場合、例外が伝播すること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(new Error('CLI process error')),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({
          toolName: 'str_replace_editor',
          affectedFilePaths: ['src/index.ts'],
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('CLI process error');
      });
    });

    context('affectedFilePathsが空配列の場合', () => {
      // IT-UC-HandlePostToolUse-006
      it('affectedFilePathsが空配列の場合、Hookが正常に実行されること', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn(),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false }),
        };
        const useCase = createHandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildPostToolUseInput({
          toolName: 'str_replace_editor',
          affectedFilePaths: [],
        });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
      });
    });
  });
});
```

### 3.4 HandleStopUseCase（7件）

```typescript
// @unit agent-integration
// @layer application
// @story H11-04

target('HandleStopUseCase.execute', () => {
  describe('Stop Hook の ReentryGuard ライフサイクルと CLI 実行を管理する', () => {
    context('ReentryGuard が非アクティブな場合（通常フロー）', () => {
      // IT-UC-HandleStop-001
      it('ReentryGuardが非アクティブな場合、harness:complete-checkが実行されること', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false }),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-001' });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.skipReason).toBeUndefined();
        expect(actual.cliResult?.exitCode).toBe(0);
      });

      // IT-UC-HandleStop-002
      it('complete-check成功後にdeactivateが呼ばれること（フラグがクリアされること）', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false }),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-002' });

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockReentryGuardStatePort.clearActive).toHaveBeenCalledOnce();
      });
    });

    context('ReentryGuard がアクティブな場合（再入フロー）', () => {
      // IT-UC-HandleStop-003
      it('ReentryGuardがアクティブな場合（再入）、REENTRY_DETECTEDでスキップされること', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(true),
          writeActive: vi.fn(),
          clearActive: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-003' });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('REENTRY_DETECTED');
      });
    });

    context('CLI が exitCode=1 で終了した場合（finally 保証）', () => {
      // IT-UC-HandleStop-004
      it('complete-checkがFail（exitCode=1）でも、deactivateが必ず呼ばれること（try/finally保証）', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 1, timedOut: false }),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-004' });

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.executed).toBe(true);
        expect(actual.cliResult?.exitCode).toBe(1);
        // finally 保証: clearActive（deactivate）が呼ばれていること
        expect(mockReentryGuardStatePort.clearActive).toHaveBeenCalledOnce();
      });
    });

    context('CLI 実行中に例外が発生した場合（finally 保証）', () => {
      // IT-UC-HandleStop-005
      it('CLI実行中に例外が発生した場合でも、deactivateが必ず呼ばれること（finally保証）', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockResolvedValue(undefined),
          clearActive: vi.fn().mockResolvedValue(undefined),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(new Error('unexpected CLI error')),
        };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-005' });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('unexpected CLI error');
        // finally 保証: エラー伝播後も clearActive が呼ばれていること
        expect(mockReentryGuardStatePort.clearActive).toHaveBeenCalledOnce();
      });
    });

    context('sessionId が空文字の場合', () => {
      // IT-UC-HandleStop-006
      it('sessionIdが空文字の場合、バリデーションエラーになること', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn(),
          writeActive: vi.fn(),
          clearActive: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: '' });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow();
      });
    });

    context('writeActive（activate）が失敗した場合', () => {
      // IT-UC-HandleStop-007
      it('writeActive（activate）が失敗した場合、エラーが伝播してdeactivateは呼ばれないこと', async () => {
        // Arrange
        const mockReentryGuardStatePort = {
          readActive: vi.fn().mockResolvedValue(false),
          writeActive: vi.fn().mockRejectedValue(new Error('write failed')),
          clearActive: vi.fn(),
        };
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = createHandleStopUseCase({
          reentryGuardStatePort: mockReentryGuardStatePort,
          cliExecutorPort: mockCliExecutorPort,
        });
        const input = buildHandleStopInput({ sessionId: 'session-007' });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('write failed');
        expect(mockReentryGuardStatePort.clearActive).not.toHaveBeenCalled();
      });
    });
  });
});
```

---

## 4. Infrastructure Adapterテスト詳細ロジック

### 4.1 EnvFileReentryGuardStateAdapter（10件）

```typescript
// @unit agent-integration
// @layer infrastructure
// @story H11-04

import { target, context } from '../../helpers/test-helpers';
import { EnvFileReentryGuardStateAdapter } from '../../../agent-integration/infrastructure/adapters/env-file-reentry-guard-state-adapter';

// クリーンアップ設定
beforeEach(async () => {
  delete process.env.HARNESS_STOP_HOOK_ACTIVE;
});
afterEach(async () => {
  const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
  await adapter.clearActive();
});

target('EnvFileReentryGuardStateAdapter', () => {
  describe('env 戦略での状態管理', () => {
    context('環境変数が未設定の場合', () => {
      // IT-REPO-EnvFileAdapter-001
      it('readActive（未設定状態）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('writeActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-002
      it('writeActive → readActive でtrueが返ること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        await adapter.writeActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('writeActive → clearActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-003
      it('writeActive → clearActive → readActive でfalseが返ること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        await adapter.writeActive();
        await adapter.clearActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('環境変数未設定で clearActive を呼ぶ場合', () => {
      // IT-REPO-EnvFileAdapter-004
      it('clearActive（未設定状態での冪等性）がエラーなく完了しfalseを返すこと', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });

        // Act
        await adapter.clearActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('file 戦略での状態管理', () => {
    context('tmpファイルが存在しない場合', () => {
      // IT-REPO-EnvFileAdapter-005
      it('readActive（tmpファイルなし）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });
        // beforeEach で clearActive 済みを前提とする

        // Act
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('writeActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-006
      it('writeActive → readActive でtmpファイルが作成されtrueが返ること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });

        // Act
        await adapter.writeActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('writeActive → clearActive 実行後', () => {
      // IT-REPO-EnvFileAdapter-007
      it('writeActive → clearActive → readActive でtmpファイルが削除されfalseが返ること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });

        // Act
        await adapter.writeActive();
        await adapter.clearActive();
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('tmpファイルが存在しない状態で clearActive を呼ぶ場合', () => {
      // IT-REPO-EnvFileAdapter-008
      it('clearActive（ファイルなし状態での冪等性）がエラーなく完了すること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'file' });

        // Act & Assert
        await expect(adapter.clearActive()).resolves.not.toThrow();
      });
    });
  });

  describe('エラーハンドリング', () => {
    context('tmpファイルの親ディレクトリが存在しない場合（file戦略）', () => {
      // IT-REPO-EnvFileAdapter-009
      it('readActive（I/Oエラー時）がfalseを返すこと（安全側に倒す）', async () => {
        // Arrange
        // 存在しない親ディレクトリを指定したアダプターを生成
        const adapter = new EnvFileReentryGuardStateAdapter({
          strategy: 'file',
          filePath: '/nonexistent/path/harness-stop-hook.lock',
        });

        // Act
        const actual = await adapter.readActive();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('書き込み権限のないパスに writeActive を呼ぶ場合（file戦略）', () => {
      // IT-REPO-EnvFileAdapter-010
      it('writeActive（I/Oエラー時）がエラーをthrowすること', async () => {
        // Arrange
        const adapter = new EnvFileReentryGuardStateAdapter({
          strategy: 'file',
          filePath: '/nonexistent/path/harness-stop-hook.lock',
        });

        // Act & Assert
        await expect(adapter.writeActive()).rejects.toThrow();
      });
    });
  });
});
```

### 4.2 HarnessConfigConfigQueryAdapter（6件）

```typescript
// @unit agent-integration
// @layer infrastructure
// @story H11-01

import path from 'node:path';

const FIXTURES_DIR = path.resolve(
  __dirname,
  '../fixtures',
);

target('HarnessConfigConfigQueryAdapter', () => {
  describe('harness.config.json から Hook 設定を読み取る', () => {
    context('cascadeUpdate=true のフィクスチャを参照する場合', () => {
      // IT-REPO-ConfigQueryAdapter-001
      it('isHookEnabled("post-tool-use")（cascadeUpdate=true）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter({
          configPath: path.join(FIXTURES_DIR, 'harness-config-enabled.json'),
        });

        // Act
        const actual = await adapter.isHookEnabled('post-tool-use');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('cascadeUpdate=false のフィクスチャを参照する場合', () => {
      // IT-REPO-ConfigQueryAdapter-002
      it('isHookEnabled("post-tool-use")（cascadeUpdate=false）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter({
          configPath: path.join(FIXTURES_DIR, 'harness-config-disabled.json'),
        });

        // Act
        const actual = await adapter.isHookEnabled('post-tool-use');

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('agentLessonCollection=true のフィクスチャを参照する場合', () => {
      // IT-REPO-ConfigQueryAdapter-003
      it('isHookEnabled("pre-tool-use")（agentLessonCollection=true）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter({
          configPath: path.join(FIXTURES_DIR, 'harness-config-enabled.json'),
        });

        // Act
        const actual = await adapter.isHookEnabled('pre-tool-use');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('Wave 2 暫定実装（追加パターンなし）', () => {
      // IT-REPO-ConfigQueryAdapter-004
      it('getProtectedFilePatterns()が空配列を返すこと（Wave 2では追加パターンなし）', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter({
          configPath: path.join(FIXTURES_DIR, 'harness-config-enabled.json'),
        });

        // Act
        const actual = await adapter.getProtectedFilePatterns();

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('Stop Hook はデフォルト有効の場合', () => {
      // IT-REPO-ConfigQueryAdapter-005
      it('isHookEnabled("stop")がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter({
          configPath: path.join(FIXTURES_DIR, 'harness-config-enabled.json'),
        });

        // Act
        const actual = await adapter.isHookEnabled('stop');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('harness.config.json が存在しない場合', () => {
      // IT-REPO-ConfigQueryAdapter-006
      it('harness.config.jsonが存在しない場合、エラーがthrowされること', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter({
          configPath: path.join(FIXTURES_DIR, 'nonexistent-config.json'),
        });

        // Act & Assert
        await expect(adapter.isHookEnabled('post-tool-use')).rejects.toThrow();
      });
    });
  });
});
```

### 4.3 HarnessApiCliCommandRegistryAdapter（4件）

```typescript
// @unit agent-integration
// @layer infrastructure
// @story H11-01

target('HarnessApiCliCommandRegistryAdapter', () => {
  describe('静的コマンドリストのコマンド存在確認を行う', () => {
    context('登録済みコマンドを照会する場合', () => {
      // IT-REPO-CliCommandRegistry-001
      it('hasCommand（登録済みコマンド "harness:lint"）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessApiCliCommandRegistryAdapter();

        // Act
        const actual = await adapter.hasCommand('harness:lint');

        // Assert
        expect(actual).toBe(true);
      });

      // IT-REPO-CliCommandRegistry-002
      it('hasCommand（登録済みコマンド "harness:complete-check"）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessApiCliCommandRegistryAdapter();

        // Act
        const actual = await adapter.hasCommand('harness:complete-check');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('未登録コマンドを照会する場合', () => {
      // IT-REPO-CliCommandRegistry-003
      it('hasCommand（未登録コマンド "harness:unknown-command"）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new HarnessApiCliCommandRegistryAdapter();

        // Act
        const actual = await adapter.hasCommand('harness:unknown-command');

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('全コマンド一覧を取得する場合', () => {
      // IT-REPO-CliCommandRegistry-004
      it('listCommands（全コマンド一覧）がintegration_contract.md §3.1定義の10コマンドを返すこと', async () => {
        // Arrange
        const adapter = new HarnessApiCliCommandRegistryAdapter();

        // Act
        const actual = await adapter.listCommands();

        // Assert
        expect(actual).toHaveLength(10);
        expect(actual).toContain('harness:lint');
        expect(actual).toContain('harness:complete-check');
      });
    });
  });
});
```

### 4.4 TsMorphImportAnalyzerAdapter（5件）

```typescript
// @unit agent-integration
// @layer infrastructure
// @story H11-01

import path from 'node:path';

const FIXTURES_DIR = path.resolve(
  __dirname,
  '../fixtures',
);

target('TsMorphImportAnalyzerAdapter', () => {
  describe('TypeScript ファイルの Agent API import を解析する', () => {
    context('エージェント固有 API を含まないファイルの場合', () => {
      // IT-REPO-ImportAnalyzer-001
      it('analyzeAgentApiImports（エージェント固有APIなし）が空のagentApiImportsを返すこと', async () => {
        // Arrange
        const adapter = new TsMorphImportAnalyzerAdapter();
        const targetFilePaths = [path.join(FIXTURES_DIR, 'no-agent-api.ts')];

        // Act
        const actual = await adapter.analyzeAgentApiImports(targetFilePaths);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].agentApiImports).toEqual([]);
      });
    });

    context('エージェント固有 API を含むファイルの場合', () => {
      // IT-REPO-ImportAnalyzer-002
      it('analyzeAgentApiImports（エージェント固有APIあり）がimport元を返すこと', async () => {
        // Arrange
        const adapter = new TsMorphImportAnalyzerAdapter();
        const targetFilePaths = [path.join(FIXTURES_DIR, 'with-agent-api.ts')];

        // Act
        const actual = await adapter.analyzeAgentApiImports(targetFilePaths);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].agentApiImports).toContain('@anthropic-ai/claude-code');
      });
    });

    context('複数ファイルを対象とする場合', () => {
      // IT-REPO-ImportAnalyzer-003
      it('analyzeAgentApiImports（複数ファイル）が2件のImportAnalysisResultを返すこと', async () => {
        // Arrange
        const adapter = new TsMorphImportAnalyzerAdapter();
        const targetFilePaths = [
          path.join(FIXTURES_DIR, 'no-agent-api.ts'),
          path.join(FIXTURES_DIR, 'with-agent-api.ts'),
        ];

        // Act
        const actual = await adapter.analyzeAgentApiImports(targetFilePaths);

        // Assert
        expect(actual).toHaveLength(2);
        const withApiResult = actual.find((r) => r.agentApiImports.length > 0);
        expect(withApiResult).toBeDefined();
        expect(withApiResult?.agentApiImports).toContain('@anthropic-ai/claude-code');
      });
    });

    context('targetFilePaths が空配列の場合', () => {
      // IT-REPO-ImportAnalyzer-004
      it('analyzeAgentApiImports（空パスリスト）が空配列を返すこと', async () => {
        // Arrange
        const adapter = new TsMorphImportAnalyzerAdapter();

        // Act
        const actual = await adapter.analyzeAgentApiImports([]);

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('存在しないファイルパスを指定した場合', () => {
      // IT-REPO-ImportAnalyzer-005
      it('analyzeAgentApiImports（存在しないファイルパス）がエラーをthrowすること', async () => {
        // Arrange
        const adapter = new TsMorphImportAnalyzerAdapter();
        const targetFilePaths = ['/nonexistent/path/file.ts'];

        // Act & Assert
        await expect(
          adapter.analyzeAgentApiImports(targetFilePaths),
        ).rejects.toThrow();
      });
    });
  });
});
```

### 4.5 ChildProcessCliExecutorAdapter（5件）

```typescript
// @unit agent-integration
// @layer infrastructure
// @story H11-03

import path from 'node:path';

const FIXTURES_DIR = path.resolve(
  __dirname,
  '../fixtures',
);

target('ChildProcessCliExecutorAdapter', () => {
  describe('子プロセスで CLI を実行し結果を返す', () => {
    context('exitCode=0 で正常終了するスクリプトを実行する場合', () => {
      // IT-REPO-CliExecutor-001
      it('execute（exitCode=0で正常終了）が { exitCode: 0, timedOut: false } を返すこと', async () => {
        // Arrange
        const adapter = new ChildProcessCliExecutorAdapter({
          scriptPath: path.join(FIXTURES_DIR, 'mock-cli-exit-0.ts'),
        });

        // Act
        const actual = await adapter.execute({
          command: 'harness:lint',
          args: ['--fast'],
          timeoutMs: 5000,
        });

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.timedOut).toBe(false);
      });
    });

    context('exitCode=1 で Lint 失敗するスクリプトを実行する場合', () => {
      // IT-REPO-CliExecutor-002
      it('execute（exitCode=1でLint失敗）が { exitCode: 1, timedOut: false } を返すこと', async () => {
        // Arrange
        const adapter = new ChildProcessCliExecutorAdapter({
          scriptPath: path.join(FIXTURES_DIR, 'mock-cli-exit-1.ts'),
        });

        // Act
        const actual = await adapter.execute({
          command: 'harness:lint',
          args: ['--fast'],
          timeoutMs: 5000,
        });

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.timedOut).toBe(false);
      });
    });

    context('stdout/stderr を出力するスクリプトを実行する場合', () => {
      // IT-REPO-CliExecutor-003
      it('execute（stdout/stderrが取得できること）が文字列フィールドを返すこと', async () => {
        // Arrange
        const adapter = new ChildProcessCliExecutorAdapter({
          scriptPath: path.join(FIXTURES_DIR, 'mock-cli-exit-0.ts'),
        });

        // Act
        const actual = await adapter.execute({
          command: 'harness:status',
          args: [],
          timeoutMs: 5000,
        });

        // Assert
        expect(typeof actual.stdout).toBe('string');
        expect(typeof actual.stderr).toBe('string');
        expect(actual.timedOut).toBe(false);
      });
    });

    context('timeoutMs 以内に完了するスクリプトを実行する場合', () => {
      // IT-REPO-CliExecutor-004
      it('timeoutMs以内に完了する場合、timedOut=falseが返ること', async () => {
        // Arrange
        const adapter = new ChildProcessCliExecutorAdapter({
          scriptPath: path.join(FIXTURES_DIR, 'mock-cli-exit-0.ts'),
        });

        // Act
        const actual = await adapter.execute({
          command: 'harness:lint',
          args: [],
          timeoutMs: 5000,
        });

        // Assert
        expect(actual.timedOut).toBe(false);
      });
    });

    context('timeoutMs を超過するスクリプトを実行する場合', () => {
      // IT-REPO-CliExecutor-005
      it('timeoutMsを超過した場合、TimeoutErrorがthrowされること（timedOut=true）', async () => {
        // Arrange
        const adapter = new ChildProcessCliExecutorAdapter({
          scriptPath: path.join(FIXTURES_DIR, 'mock-cli-slow.ts'),
        });

        // Act & Assert
        await expect(
          adapter.execute({
            command: 'harness:lint',
            args: [],
            timeoutMs: 100, // 100ms でタイムアウト（スクリプトは 1000ms 待機）
          }),
        ).rejects.toMatchObject({ timedOut: true });
      }, 3000);
    });
  });
});
```

---

## 5. Presentation Hook Adapterテスト詳細ロジック

> **テスト方針**: UseCase を DI で注入する方式を採用する。子プロセス起動方式は採用しない。
> Hook Adapter テストは UseCase をモック注入してインスタンス化し、stdin JSON のシミュレーションと exit code 相当の戻り値を直接検証する。

### 5.1 pre-tool-use-hook（7件）

```typescript
// @unit agent-integration
// @layer presentation
// @story H11-02

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { PreToolUseHookHandler } from '../../../../agent-integration/presentation/hooks/pre-tool-use-hook';

target('PreToolUseHookHandler.handle', () => {
  describe('stdin JSON を解析して UseCase を呼び出し exit code を返す', () => {
    context('biome.json への変更がブロックされる場合', () => {
      // IT-API-PreToolUse-001
      it('biome.json を対象とした入力が exit code 2（ブロック）を返すこと', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            shouldBlock: true,
            blockedFilePath: 'biome.json',
          }),
        };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_input: { path: 'biome.json' },
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });

    context('保護対象外ファイルへのアクセスの場合', () => {
      // IT-API-PreToolUse-002
      it('src/index.ts を対象とした入力が exit code 0（通過）を返すこと', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            shouldBlock: false,
            blockedFilePath: undefined,
          }),
        };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_input: { path: 'src/index.ts' },
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('package.json への変更がブロックされる場合', () => {
      // IT-API-PreToolUse-003
      it('package.json を対象とした入力が exit code 2（ブロック）を返すこと', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            shouldBlock: true,
            blockedFilePath: 'package.json',
          }),
        };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_input: { path: 'package.json' },
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });

    context('保護対象外ファイルへのアクセスの場合（正常系）', () => {
      // IT-API-PreToolUse-004
      it('保護対象外ファイルへのアクセスが exit code 0かつstderrなしで返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({ shouldBlock: false }),
        };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'read_file',
          tool_input: { path: 'src/utils.ts' },
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr ?? '').toBe('');
      });
    });

    context('保護対象ファイルへのアクセスの場合（正常系）', () => {
      // IT-API-PreToolUse-005
      it('保護対象ファイルへのアクセスが exit code 2かつstderrにブロックメッセージありで返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            shouldBlock: true,
            blockedFilePath: 'biome.json',
          }),
        };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_input: { path: 'biome.json' },
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toContain('biome.json');
      });
    });

    context('不正な JSON が入力された場合（異常系）', () => {
      // IT-API-PreToolUse-006
      it('不正なJSONが exit code 2（実行エラー）かつstderrにエラーメッセージで返ること', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = '{ invalid json';

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });

    context('tool_name フィールドが欠落した入力の場合（異常系）', () => {
      // IT-API-PreToolUse-007
      it('tool_nameフィールドなしの入力が exit code 2（実行エラー）を返すこと', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const handler = new PreToolUseHookHandler({ handlePreToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ tool_input: {} });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
```

### 5.2 post-tool-use-hook（7件）

```typescript
// @unit agent-integration
// @layer presentation
// @story H11-03

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { PostToolUseHookHandler } from '../../../../agent-integration/presentation/hooks/post-tool-use-hook';

target('PostToolUseHookHandler.handle', () => {
  describe('stdin JSON を解析して UseCase を呼び出し exit code を返す', () => {
    context('不正な JSON が入力された場合', () => {
      // IT-API-PostToolUse-001
      it('不正なJSONが exit code 2かつstderrにエラーメッセージで返ること', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = '{ bad json';

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });

    context('tool_name フィールドが欠落した入力の場合', () => {
      // IT-API-PostToolUse-002
      it('tool_nameフィールドなしの入力が exit code 2 を返すこと', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ tool_response: {} });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });

    context('UseCase が executed=true かつ exitCode=0 を返す場合', () => {
      // IT-API-PostToolUse-003
      it('正常実行（executed=true, exitCode=0）が exit code 0 を返すこと', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: true,
            skipReason: undefined,
            cliResult: { exitCode: 0 },
          }),
        };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_response: {},
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('Lint が失敗した場合（exitCode=1）', () => {
      // IT-API-PostToolUse-004
      it('Lint失敗（executed=true, cliResult.exitCode=1）が exit code 1かつstderrにLint失敗メッセージで返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: true,
            skipReason: undefined,
            cliResult: { exitCode: 1 },
          }),
        };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_response: {},
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stderr).toBeTruthy();
      });
    });

    context('Hook が HOOK_DISABLED でスキップされる場合', () => {
      // IT-API-PostToolUse-005
      it('HOOK_DISABLEDスキップが exit code 0かつstderrにスキップ理由で返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: false,
            skipReason: 'HOOK_DISABLED',
          }),
        };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_response: {},
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain('HOOK_DISABLED');
      });
    });

    context('タイムアウト超過で TIMEOUT_EXCEEDED になる場合', () => {
      // IT-API-PostToolUse-006
      it('TIMEOUT_EXCEEDEDスキップが exit code 0（スキップ扱い）を返すこと', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: false,
            skipReason: 'TIMEOUT_EXCEEDED',
          }),
        };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_response: {},
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('UseCase が例外をスローした場合', () => {
      // IT-API-PostToolUse-007
      it('UseCase実行エラーが exit code 2かつstderrに診断情報で返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('internal error')),
        };
        const handler = new PostToolUseHookHandler({ handlePostToolUseUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({
          tool_name: 'str_replace_editor',
          tool_response: {},
        });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });
  });
});
```

### 5.3 stop-hook（7件）

```typescript
// @unit agent-integration
// @layer presentation
// @story H11-04

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { StopHookHandler } from '../../../../agent-integration/presentation/hooks/stop-hook';

target('StopHookHandler.handle', () => {
  describe('stdin JSON を解析して UseCase を呼び出し exit code を返す', () => {
    context('不正な JSON が入力された場合', () => {
      // IT-API-StopHook-001
      it('不正なJSONが exit code 2かつstderrにエラーメッセージで返ること', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = '{ bad json';

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });

    context('session_id フィールドが欠落した入力の場合', () => {
      // IT-API-StopHook-002
      it('session_idフィールドなしの入力（{}）が exit code 2 を返すこと', async () => {
        // Arrange
        const mockUseCase = { execute: vi.fn() };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({});

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });

    context('UseCase が executed=true かつ exitCode=0 を返す場合', () => {
      // IT-API-StopHook-003
      it('正常実行（executed=true, exitCode=0）が exit code 0 を返すこと', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: true,
            skipReason: undefined,
            cliResult: { exitCode: 0 },
          }),
        };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ session_id: 'abc123' });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('complete-check が失敗した場合（exitCode=1）', () => {
      // IT-API-StopHook-004
      it('complete-check失敗（executed=true, cliResult.exitCode=1）が exit code 1かつstderrにCheck失敗メッセージで返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: true,
            skipReason: undefined,
            cliResult: { exitCode: 1 },
          }),
        };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ session_id: 'abc123' });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stderr).toBeTruthy();
      });
    });

    context('REENTRY_DETECTED でスキップされる場合', () => {
      // IT-API-StopHook-005
      it('REENTRY_DETECTEDスキップが exit code 0かつstderrに再入検出メッセージで返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            executed: false,
            skipReason: 'REENTRY_DETECTED',
          }),
        };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ session_id: 'abc123' });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stderr).toContain('REENTRY_DETECTED');
      });
    });

    context('UseCase が例外をスローした場合', () => {
      // IT-API-StopHook-006
      it('UseCase実行エラーが exit code 2かつstderrに診断情報で返ること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('use case error')),
        };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ session_id: 'abc123' });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
        expect(actual.stderr).toBeTruthy();
      });
    });

    context('UseCase 実行中に予期しない例外が発生した場合', () => {
      // IT-API-StopHook-007
      it('UseCase実行中の予期しない例外が exit code 2（実行エラー）で安全に終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockImplementation(() => {
            throw new TypeError('unexpected type error');
          }),
        };
        const handler = new StopHookHandler({ handleStopUseCase: mockUseCase });
        const stdinPayload = JSON.stringify({ session_id: 'abc123' });

        // Act
        const actual = await handler.handle(stdinPayload);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
```

---

## 6. Hook Flow統合テスト詳細ロジック（5件）

```typescript
// @unit agent-integration
// @layer infrastructure
// @story H11-04

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { EnvFileReentryGuardStateAdapter } from '../../../agent-integration/infrastructure/adapters/env-file-reentry-guard-state-adapter';
import { HandleStopUseCase } from '../../../agent-integration/application/usecases/handle-stop-usecase';
import { HandlePreToolUseUseCase } from '../../../agent-integration/application/usecases/handle-pre-tool-use-usecase';
import { HandlePostToolUseUseCase } from '../../../agent-integration/application/usecases/handle-post-tool-use-usecase';

// クリーンアップ設定
beforeEach(async () => {
  delete process.env.HARNESS_STOP_HOOK_ACTIVE;
});
afterEach(async () => {
  const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
  await adapter.clearActive();
});

target('Hook Flow Integration', () => {
  describe('UseCase と Adapter の結合フローを検証する', () => {
    context('Stop Hook 通常フロー（ReentryGuard inactive）', () => {
      // IT-UC-HookFlow-001
      it('Stop Hook通常フロー：ReentryGuard inactive → activate → complete-check実行 → deactivate', async () => {
        // Arrange
        const reentryGuardStateAdapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false }),
        };
        const useCase = new HandleStopUseCase({
          reentryGuardStatePort: reentryGuardStateAdapter,
          cliExecutorPort: mockCliExecutorPort,
        });

        // Act
        const actual = await useCase.execute({ sessionId: 'flow-001' });

        // Assert
        expect(actual.executed).toBe(true);
        // フラグが最終的にクリアされていること
        const flagAfter = await reentryGuardStateAdapter.readActive();
        expect(flagAfter).toBe(false);
      });
    });

    context('Stop Hook 再入フロー（ReentryGuard active）', () => {
      // IT-UC-HookFlow-002
      it('Stop Hook再入フロー：ReentryGuard active → REENTRY_DETECTED、フラグ状態は変化しない', async () => {
        // Arrange
        const reentryGuardStateAdapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
        await reentryGuardStateAdapter.writeActive(); // 事前にフラグをセット
        const mockCliExecutorPort = { execute: vi.fn() };
        const useCase = new HandleStopUseCase({
          reentryGuardStatePort: reentryGuardStateAdapter,
          cliExecutorPort: mockCliExecutorPort,
        });

        // Act
        const actual = await useCase.execute({ sessionId: 'flow-002' });

        // Assert
        expect(actual.executed).toBe(false);
        expect(actual.skipReason).toBe('REENTRY_DETECTED');
        // フラグ状態は変化しないこと（active のまま）
        const flagAfter = await reentryGuardStateAdapter.readActive();
        expect(flagAfter).toBe(true);
      });
    });

    context('PostToolUse Hook 正常フロー', () => {
      // IT-UC-HookFlow-003
      it('PostToolUse Hook正常フロー：Hook有効 → harness:lint --fast実行', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn().mockResolvedValue(true),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const mockCliExecutorPort = {
          execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false }),
        };
        const useCase = new HandlePostToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
          cliExecutorPort: mockCliExecutorPort,
        });

        // Act
        const actual = await useCase.execute({
          toolName: 'str_replace_editor',
          affectedFilePaths: ['src/index.ts'],
        });

        // Assert
        expect(actual.executed).toBe(true);
        // CLI コマンドが正しく渡されていること
        expect(mockCliExecutorPort.execute).toHaveBeenCalledWith(
          expect.objectContaining({ command: expect.stringContaining('lint') }),
        );
      });
    });

    context('PreToolUse Hook 保護フロー', () => {
      // IT-UC-HookFlow-004
      it('PreToolUse Hook保護フロー：biome.json変更 → ブロック', async () => {
        // Arrange
        const mockConfigQueryPort = {
          isHookEnabled: vi.fn(),
          getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
        };
        const useCase = new HandlePreToolUseUseCase({
          configQueryPort: mockConfigQueryPort,
        });

        // Act
        const actual = await useCase.execute({
          toolName: 'str_replace_editor',
          targetFilePaths: ['biome.json'],
        });

        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.blockedFilePath).toBe('biome.json');
      });
    });

    context('CLI 実行エラー時の ReentryGuard デアクティベート保証', () => {
      // IT-UC-HookFlow-005
      it('CLI実行エラー時のReentryGuardデアクティベート保証：エラー伝播しつつフラグがクリアされること', async () => {
        // Arrange
        const reentryGuardStateAdapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
        const mockCliExecutorPort = {
          execute: vi.fn().mockRejectedValue(new Error('CLI crashed')),
        };
        const useCase = new HandleStopUseCase({
          reentryGuardStatePort: reentryGuardStateAdapter,
          cliExecutorPort: mockCliExecutorPort,
        });

        // Act & Assert
        await expect(
          useCase.execute({ sessionId: 'flow-005' }),
        ).rejects.toThrow('CLI crashed');
        // finally 保証：エラー後もフラグがクリアされていること
        const flagAfter = await reentryGuardStateAdapter.readActive();
        expect(flagAfter).toBe(false);
      });
    });
  });
});
```

---

## 7. テスト実行コマンド

```bash
# agent-integration ユニット全テスト実行
pnpm vitest run --reporter=verbose scripts/harness/__tests__/integration/agent-integration

# UseCase テストのみ実行
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/verify-fallback-capability-usecase.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/handle-post-tool-use-usecase.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/handle-stop-usecase.test.ts

# Infrastructure Adapter テストのみ実行
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/env-file-reentry-guard-state-adapter.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/harness-api-cli-command-registry-adapter.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/ts-morph-import-analyzer-adapter.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/child-process-cli-executor-adapter.test.ts

# Presentation Hook テストのみ実行
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/hook/pre-tool-use-hook.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/hook/post-tool-use-hook.test.ts
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/hook/stop-hook.test.ts

# Hook Flow 統合テストのみ実行
pnpm vitest run scripts/harness/__tests__/integration/agent-integration/hook-flow-integration.test.ts

# @story タグでフィルタ実行（H11-04 のみ）
pnpm vitest run --reporter=verbose --grep "H11-04" scripts/harness/__tests__/integration/agent-integration
```
