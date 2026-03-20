# シナリオテストロジック設計: H12-04 — Agent-Lesson System（lesson artifact出力）
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20
> **対応テストケース**: SC-SQ-H1204-001〜SC-SQ-H1204-002
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

既存のrun()ヘルパーを使用（cli-harness.test.ts 共通）

## 2. テストケース疑似コード

```typescript
describe('skill-quality コマンド群', () => {
  // SC-SQ-H1204-001
  it('skill:collect-lessons --story が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('skill:collect-lessons', '--story', 'H99-01');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: skill:collect-lessons');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "skill-quality"
```
