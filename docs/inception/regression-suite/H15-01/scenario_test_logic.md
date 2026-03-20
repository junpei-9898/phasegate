# シナリオテストロジック設計: H15-01 — v0 143テスト仕様のv1再実装
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応テストケース**: SC-RS-H1501-001
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('regression-suite コマンド群', () => {
  // SC-RS-H1501-001
  it('regression:analyze-migration が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:analyze-migration', '--dry-run');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: regression:analyze-migration');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "regression-suite"
```
