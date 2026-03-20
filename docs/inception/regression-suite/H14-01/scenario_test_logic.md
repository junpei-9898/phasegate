# シナリオテストロジック設計: H14-01 — K1-K13回帰テスト整備
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応テストケース**: SC-RS-H1401-001〜SC-RS-H1401-002
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('regression-suite コマンド群', () => {
  // SC-RS-H1401-001
  it('regression:run-k-requirements が exit 0 で完了する（stub実装）', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:run-k-requirements');

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('K-Requirements');
  });

  // SC-RS-H1401-002
  it('regression:run-k-requirements --json でJSON形式の出力が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:run-k-requirements', '--json');

    // Assert
    expect(actual.exitCode).toBe(0);
    const parsed = JSON.parse(actual.stdout);
    expect(typeof parsed).toBe('object');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "regression-suite"
```
