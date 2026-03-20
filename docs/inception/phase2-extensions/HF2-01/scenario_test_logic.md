# シナリオテストロジック設計: phase2-extensions

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **対応テストケース**: SC-P2-001〜SC-P2-010
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

---

## 1. テストヘルパー

```typescript
// 既存のrun()ヘルパーを使用（cli-harness.test.tsで定義済み）
```

---

## 2. テストケース疑似コード

### 2.1 p2:check-freshness コマンド群

```typescript
describe('phase2-extensions コマンド群', () => {
  // SC-P2-001
  it('p2:check-freshness が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:check-freshness');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: p2:check-freshness');
  });

  // SC-P2-002
  it('p2:check-freshness --dry-run が exit 0 で完了する', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:check-freshness', '--dry-run');

    // Assert
    expect(actual.exitCode).toBe(0);
  });

  // SC-P2-003
  it('p2:check-freshness --format json でJSON形式の出力が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:check-freshness', '--format', 'json');

    // Assert
    expect(actual.exitCode).toBe(0);
    const parsed = JSON.parse(actual.stdout);
    expect(typeof parsed).toBe('object');
  });

  // SC-P2-004
  it('p2:check-freshness --pattern でパターン指定を受け付ける', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:check-freshness', '--pattern', 'docs/**/*.md');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command');
  });

  // SC-P2-005
  it('p2:validate-pointers が "Unknown command" にならない', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:validate-pointers');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: p2:validate-pointers');
  });

  // SC-P2-006
  it('p2:validate-pointers --include-urls を受け付ける', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:validate-pointers', '--include-urls');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command');
  });

  // SC-P2-007
  it('p2:validate-pointers --format json でJSON形式の出力が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:validate-pointers', '--format', 'json');

    // Assert
    expect(actual.exitCode).toBe(0);
    const parsed = JSON.parse(actual.stdout);
    expect(typeof parsed).toBe('object');
  });

  // SC-P2-008
  it('p2:generate-e2e-template --phase でテンプレートが生成される', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:generate-e2e-template', '--phase', 'construction');

    // Assert
    expect(actual.stderr).not.toContain('Unknown command: p2:generate-e2e-template');
    expect(actual.exitCode).toBe(0);
  });

  // SC-P2-009
  it('p2:generate-e2e-template --phase なしで exit 2 が返る', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:generate-e2e-template');

    // Assert
    expect(actual.exitCode).toBe(2);
  });

  // SC-P2-010
  it('p2:generate-e2e-template --phase 指定でテンプレート内容が出力される', () => {
    // Arrange: なし

    // Act
    const actual = run('p2:generate-e2e-template', '--phase', 'test');

    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.stdout.length).toBeGreaterThan(0);
  });
});
```

---

## 3. テスト実行コマンド

```bash
# E2Eテスト全体
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts

# phase2-extensions関連のみ
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "phase2-extensions"
```
