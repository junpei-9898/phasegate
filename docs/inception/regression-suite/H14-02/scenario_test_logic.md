# シナリオテストロジック設計: H14-02 — K14-K15回帰テスト + エージェント非依存ガード
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応テストケース**: SC-RS-H1402-001〜SC-RS-H1402-002
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('regression-suite コマンド群', () => {
  // SC-RS-H1402-001
  it('regression:run-k14-k15 が exit 0 で完了する（stub実装）', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:run-k14-k15');

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('K14/K15');
  });

  // SC-RS-H1402-002
  it('regression:run-agent-guard が exit 0 で完了する（stub実装）', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:run-agent-guard');

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('Agent Independence');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "regression-suite"
```
