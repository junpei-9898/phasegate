# シナリオテストロジック: H11-04 — Claude Code Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止）
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H11-04-001: Stop Hook が正常に phasegate:complete-check を呼び出すこと

```typescript
describe('HandleStopUseCase', () => {
  describe('ReentryGuardが非アクティブかつCLI正常終了の場合', () => {
    it('executed=trueでcliResult.exitCode=0が返ること', async () => {
      // Arrange
      const reentryGuardStatePort = {
        isActive: vi.fn().mockResolvedValue(false),
        activate: vi.fn().mockResolvedValue(undefined),
        deactivate: vi.fn().mockResolvedValue(undefined),
      };
      const configQueryPort = { isEnabled: vi.fn().mockResolvedValue(true) };
      const cliCommandRegistryPort = { listAll: vi.fn().mockResolvedValue(['phasegate:complete-check']) };
      const cliExecutorPort = {
        execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
      };
      const target = new HandleStopUseCase({
        reentryGuardStatePort,
        cliExecutorPort,
        configQueryPort,
        cliCommandRegistryPort,
      });

      // Act
      const actual = await target.execute({ sessionId: 'session-123' });

      // Assert
      expect(actual.executed).toBe(true);
      expect(actual.skipReason).toBeUndefined();
      expect(actual.cliResult?.exitCode).toBe(0);
    });
  });
});
```

### SC-H11-04-002: 再入検出時にREENTRY_DETECTEDでスキップされること

```typescript
describe('ReentryGuardがアクティブな場合', () => {
  it('REENTRY_DETECTEDでスキップされること', async () => {
    // Arrange
    const reentryGuardStatePort = {
      isActive: vi.fn().mockResolvedValue(true),
      activate: vi.fn(),
      deactivate: vi.fn(),
    };
    const cliExecutorPort = { execute: vi.fn() };
    const configQueryPort = { isEnabled: vi.fn().mockResolvedValue(true) };
    const cliCommandRegistryPort = { listAll: vi.fn().mockResolvedValue(['phasegate:complete-check']) };
    const target = new HandleStopUseCase({
      reentryGuardStatePort,
      cliExecutorPort,
      configQueryPort,
      cliCommandRegistryPort,
    });

    // Act
    const actual = await target.execute({ sessionId: 'session-123' });

    // Assert
    expect(actual.skipReason).toBe('REENTRY_DETECTED');
    expect(actual.executed).toBe(false);
    expect(cliExecutorPort.execute).not.toHaveBeenCalled();
  });
});
```

### SC-H11-04-006: ReentryGuard INV-1 違反テスト

```typescript
describe('ReentryGuard', () => {
  describe('activate()の二重呼び出し', () => {
    it('isActive()=trueの状態でactivate()するとHarnessErrorが発生すること', () => {
      // Arrange
      const target = new ReentryGuard();
      target.activate();

      // Act & Assert
      expect(() => target.activate()).toThrow();
    });
  });
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| ReentryGuardStatePort | `isActive()` → true/false; `activate()`, `deactivate()` → void |
| CliExecutorPort | `execute()` → `{ exitCode: 0/1, stdout: '', stderr: '' }` |
| ConfigQueryPort | `isEnabled()` → true |
| CliCommandRegistryPort | `listAll()` → `['phasegate:complete-check']` |

## 3. アサーション方針

- `actual.skipReason === 'REENTRY_DETECTED'` で無限ループ防止を確認
- `actual.executed` の boolean値で実行有無を判定
- 正常完了後に `reentryGuardStatePort.deactivate()` が呼び出されたことを確認（`toHaveBeenCalled()`）
- Presentation層（stop-hook.ts）: `skipReason === 'REENTRY_DETECTED'` → stderrに警告出力してexitCode=0
- Presentation層: `cliResult.exitCode !== 0` → stderrにComplete Check失敗メッセージ出力
