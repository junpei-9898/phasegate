# シナリオテストロジック設計: H12-05 — Cascade Updater拡張
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20
> **対応テストケース**: SC-SQ-H1205-001
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('skill-quality コマンド群', () => {
  // SC-SQ-H1205-001
  it('skill:apply-cascade-update --story が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('skill:apply-cascade-update', '--story', 'H12-05');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "skill-quality"
```
