# シナリオテストロジック設計: H15-02 — v1再実装テストのCIゲート化
> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **対応テストケース**: SC-RS-H1502-001〜SC-RS-H1502-003
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('regression-suite コマンド群', () => {
  // SC-RS-H1502-001
  it('regression:configure-ci-gate デフォルト値で exit 0 が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:configure-ci-gate');

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout).toContain('CI gate configured');
  });

  // SC-RS-H1502-002
  it('regression:configure-ci-gate --suites 不正値で exit 2 が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:configure-ci-gate', '--suites', 'invalid-suite');

    // Assert
    expect(actual.exitCode).toBe(2);
    expect(actual.stderr).toContain('Invalid suite ID');
  });

  // SC-RS-H1502-003
  it('regression:configure-ci-gate --json でJSON形式の出力が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('regression:configure-ci-gate', '--json');

    // Assert
    expect(actual.exitCode).toBe(0);
    const parsed = JSON.parse(actual.stdout);
    expect(typeof parsed.coverageThreshold).toBe('number');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "regression-suite"
```
