# シナリオテストロジック設計: fuse-hooks-engine

> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-20
> **対応テストケース**: SC-HF-001〜SC-HF-006
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

---

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

---

## 2. テストケース疑似コード

### 2.1 hooks:config コマンド群

```typescript
describe('fuse-hooks-engine コマンド群', () => {
  // SC-HF-001
  it('hooks:config が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('hooks:config');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: hooks:config');
  });

  // SC-HF-002
  it('hooks:config load サブコマンドがデフォルトで実行される', () => {
    // Arrange: なし

    // Act
    const actual = run('hooks:config');

    // Assert
    // 設定ファイル未存在でもexit 0（空設定ロード）またはexit 2（ファイル未検出）
    expect([0, 2]).toContain(actual.exitCode);
  });

  // SC-HF-003
  it('hooks:config --yaml でファイルパスを受け付ける', () => {
    // Arrange: なし

    // Act
    const actual = run('hooks:config', '--yaml', '.harness-hooks.yml');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command');
  });

  // SC-HF-004
  it('hooks:gate-check が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('hooks:gate-check');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: hooks:gate-check');
  });

  // SC-HF-005
  it('hooks:gate-check --story でストーリーIDを受け付ける', () => {
    // Arrange: なし

    // Act
    const actual = run('hooks:gate-check', '--story', 'HF1-01');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command');
  });

  // SC-HF-006
  it('hooks:gate-check 引数なしでの動作が定義されている', () => {
    // Arrange: なし

    // Act
    const actual = run('hooks:gate-check');

    // Assert
    expect([0, 2]).toContain(actual.exitCode);
  });
});
```

---

## 3. テスト実行コマンド

```bash
# E2Eテスト全体
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts

# fuse-hooks-engine関連のみ
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "fuse-hooks-engine"
```
