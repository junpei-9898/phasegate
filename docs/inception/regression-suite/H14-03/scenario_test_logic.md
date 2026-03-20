# シナリオテストロジック設計: H14-03 — Go/No-Go Gate品質側3条件回帰テスト
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応テストケース**: SC-RS-H1403-001
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('regression-suite コマンド群', () => {
  // SC-RS-H1403-001
  it('regression:run-gng-gate が exit 0 で完了する（stub実装）', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:run-gng-gate');

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('GnG Gate');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "regression-suite"
```
