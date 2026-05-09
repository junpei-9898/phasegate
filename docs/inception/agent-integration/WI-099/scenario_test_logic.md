# シナリオテストロジック: H11-02 — Claude Code PreToolUse Hook Adapter（リンター設定保護）
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H11-02-001: biome.json への変更がブロックされること

```typescript
describe('HandlePreToolUseUseCase', () => {
  describe('保護対象ファイルへの変更が試みられた場合', () => {
    it('shouldBlock=trueとblockedFilePathが返ること', async () => {
      // Arrange
      const configQueryPort = {
        isEnabled: vi.fn().mockResolvedValue(true),
        getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
      };
      const target = new HandlePreToolUseUseCase({ configQueryPort });

      // Act
      const actual = await target.execute({
        toolName: 'Write',
        targetFilePaths: ['biome.json'],
      });

      // Assert
      expect(actual.shouldBlock).toBe(true);
      expect(actual.blockedFilePath).toBe('biome.json');
    });
  });
});
```

### SC-H11-02-005: 通常のTypeScriptファイルへの変更はブロックされないこと

```typescript
describe('保護対象外ファイルへの変更が試みられた場合', () => {
  it('shouldBlock=falseが返ること', async () => {
    // Arrange
    const configQueryPort = {
      isEnabled: vi.fn().mockResolvedValue(true),
      getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    };
    const target = new HandlePreToolUseUseCase({ configQueryPort });

    // Act
    const actual = await target.execute({
      toolName: 'Write',
      targetFilePaths: ['src/index.ts'],
    });

    // Assert
    expect(actual.shouldBlock).toBe(false);
  });
});
```

## 2. ProtectedFileList ユニットテストロジック

```typescript
describe('ProtectedFileList', () => {
  describe('matches()', () => {
    it('biome.jsonはデフォルトパターンにマッチすること', () => {
      // Arrange
      const target = ProtectedFileList.createDefault();

      // Act
      const actual = target.matches('biome.json');

      // Assert
      expect(actual).toBe(true);
    });

    it('src/index.tsはデフォルトパターンにマッチしないこと', () => {
      // Arrange
      const target = ProtectedFileList.createDefault();

      // Act
      const actual = target.matches('src/index.ts');

      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| ConfigQueryPort | `isEnabled()` → true（Hook有効）, `getProtectedFilePatterns()` → []（追加パターンなし） |

## 3. アサーション方針

- `actual.shouldBlock` の boolean値で判定
- ブロック時は `actual.blockedFilePath` が対象ファイルパスと一致することを確認
- Presentation層（pre-tool-use-hook.ts）: shouldBlock=true → exitCode=2、false → exitCode=0
