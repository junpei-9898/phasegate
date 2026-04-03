# シナリオテストロジック: H11-01 — コア品質能力のCLI/FSフォールバック定義
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H11-01-001: フォールバック仕様が有効なCLIコマンドのみを宣言している場合に検証が通ること

```typescript
describe('VerifyFallbackCapabilityUseCase', () => {
  describe('有効なフォールバック仕様が渡された場合', () => {
    it('HarnessError[]が空配列で返ること', async () => {
      // Arrange
      const importAnalyzerPort = { analyzeImports: vi.fn().mockResolvedValue([]) };
      const cliCommandRegistryPort = { listAll: vi.fn().mockResolvedValue(['phasegate:lint', 'phasegate:complete-check']) };
      const target = new VerifyFallbackCapabilityUseCase({ importAnalyzerPort, cliCommandRegistryPort });
      const spec = FallbackCapabilitySpec.create({
        supportedCommands: ['phasegate:lint', 'phasegate:complete-check'],
        noAgentApiImports: true,
      });

      // Act
      const actual = await target.execute({ spec });

      // Assert
      expect(actual.errors).toHaveLength(0);
    });
  });
});
```

### SC-H11-01-002: 未登録コマンドが宣言されている場合に検証が失敗すること

```typescript
it('未登録コマンドに対してHarnessErrorが返ること', async () => {
  // Arrange
  const cliCommandRegistryPort = { listAll: vi.fn().mockResolvedValue([]) };
  const importAnalyzerPort = { analyzeImports: vi.fn().mockResolvedValue([]) };
  const target = new VerifyFallbackCapabilityUseCase({ importAnalyzerPort, cliCommandRegistryPort });
  const spec = FallbackCapabilitySpec.create({
    supportedCommands: ['harness:unknown'],
    noAgentApiImports: false,
  });

  // Act
  const actual = await target.execute({ spec });

  // Assert
  expect(actual.errors.length).toBeGreaterThan(0);
});
```

### SC-H11-01-003: エージェントAPI参照が検出された場合に検証が失敗すること

```typescript
it('エージェントAPI参照検出時にHarnessErrorが返ること', async () => {
  // Arrange
  const importAnalyzerPort = {
    analyzeImports: vi.fn().mockResolvedValue([{
      modulePath: 'domain/foo.ts',
      importedFrom: '@anthropic-ai/claude-code',
    }]),
  };
  const cliCommandRegistryPort = { listAll: vi.fn().mockResolvedValue(['phasegate:lint']) };
  const target = new VerifyFallbackCapabilityUseCase({ importAnalyzerPort, cliCommandRegistryPort });
  const spec = FallbackCapabilitySpec.create({
    supportedCommands: ['phasegate:lint'],
    noAgentApiImports: true,
  });

  // Act
  const actual = await target.execute({ spec });

  // Assert
  expect(actual.errors.length).toBeGreaterThan(0);
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| ImportAnalyzerPort | `vi.fn()` でエージェントAPI参照リスト（空 or 検出あり）を返す |
| CliCommandRegistryPort | `vi.fn()` でCommandName[]（有効なコマンド一覧）を返す |

## 3. アサーション方針

- `actual.errors` の length で成功/失敗を判定
- エラー内容の `code` フィールドで具体的な違反種別を確認
- noAgentApiImports=false の場合は ImportAnalyzerPort が呼び出されないことを `expect(importAnalyzerPort.analyzeImports).not.toHaveBeenCalled()` で確認
