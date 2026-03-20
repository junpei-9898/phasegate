# シナリオテストロジック設計: H12-01 — story-implementor Atomic Git Commits + TDD品質契約
> **Unit ID**: skill-quality
> **作成日**: 2026-03-20
> **対応テストケース**: SC-SQ-H1201-001〜SC-SQ-H1201-002
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 1. テストヘルパー

```typescript
// 既存のrun()ヘルパーを使用
function run(...args: string[]) {
  const result = spawnSync('npx', ['tsx', MAIN, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  return {
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    exitCode: result.status ?? 2,
  };
}
```

## 2. テストケース疑似コード

```typescript
describe('skill-quality コマンド群', () => {
  // SC-SQ-H1201-001
  it('skill:execute-tdd-cycle --story が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('skill:execute-tdd-cycle', '--story', 'H12-01', '--phase', 'REFACTOR');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: skill:execute-tdd-cycle');
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "skill-quality"
```
