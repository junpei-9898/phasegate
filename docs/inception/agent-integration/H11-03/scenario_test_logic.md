# シナリオテストロジック: H11-03 — Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント）
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H11-03-001: PostToolUse Hook が正常に harness:lint --fast を呼び出すこと

```typescript
describe('HandlePostToolUseUseCase', () => {
  describe('Hook有効かつCLI正常終了の場合', () => {
    it('executed=trueでcliResult.exitCode=0が返ること', async () => {
      // Arrange
      const configQueryPort = {
        isEnabled: vi.fn().mockResolvedValue(true),
      };
      const cliCommandRegistryPort = {
        listAll: vi.fn().mockResolvedValue(['harness:lint']),
      };
      const cliExecutorPort = {
        execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      };
      const target = new HandlePostToolUseUseCase({
        configQueryPort,
        cliExecutorPort,
        cliCommandRegistryPort,
      });

      // Act
      const actual = await target.execute({ toolName: 'Write', affectedFilePaths: [] });

      // Assert
      expect(actual.executed).toBe(true);
      expect(actual.skipReason).toBeUndefined();
      expect(actual.cliResult?.exitCode).toBe(0);
    });
  });
});
```

### SC-H11-03-003: Hook無効設定時にスキップされること

```typescript
describe('Hook無効設定の場合', () => {
  it('HOOK_DISABLEDでスキップされること', async () => {
    // Arrange
    const configQueryPort = {
      isEnabled: vi.fn().mockResolvedValue(false),
    };
    const cliExecutorPort = { execute: vi.fn() };
    const cliCommandRegistryPort = { listAll: vi.fn().mockResolvedValue(['harness:lint']) };
    const target = new HandlePostToolUseUseCase({
      configQueryPort,
      cliExecutorPort,
      cliCommandRegistryPort,
    });

    // Act
    const actual = await target.execute({ toolName: 'Write', affectedFilePaths: [] });

    // Assert
    expect(actual.executed).toBe(false);
    expect(actual.skipReason).toBe('HOOK_DISABLED');
    expect(cliExecutorPort.execute).not.toHaveBeenCalled();
  });
});
```

### SC-H11-03-002: HookTranslationResult.timeoutMsが500に設定されること

```typescript
describe('HookToCliTranslator（PostToolUse）', () => {
  it('PostToolUseEventがtimeoutMs=500のHookTranslationResultに変換されること', () => {
    // Arrange
    const context = { /* ポートモック */ };
    const target = new HookToCliTranslator(context);
    const event: PostToolUseEvent = {
      hookType: 'post-tool-use',
      toolName: 'Write',
      affectedFilePaths: ['src/foo.ts'],
    };

    // Act
    const actual = target.translate(event);

    // Assert
    expect(actual.timeoutMs).toBe(500);
    expect(actual.cliCommand).toBe('harness:lint');
    expect(actual.cliArgs).toContain('--fast');
  });
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| ConfigQueryPort | `isEnabled('post-tool-use')` → true/false |
| CliExecutorPort | `execute()` → `{ exitCode: 0/1, stdout: '', stderr: '' }` またはタイムアウトエラー |
| CliCommandRegistryPort | `listAll()` → `['harness:lint']` |

## 3. アサーション方針

- `actual.executed` の boolean値で実行有無を判定
- `actual.skipReason` の string値（`'HOOK_DISABLED'` / `'TIMEOUT_EXCEEDED'`）でスキップ理由を確認
- `actual.cliResult.exitCode` でCLI実行結果を確認
- Presentation層（post-tool-use-hook.ts）: `cliResult.exitCode !== 0` → stderrにLint失敗メッセージ出力
