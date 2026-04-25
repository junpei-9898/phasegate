# シナリオテストロジック設計: H10-04

> **Unit ID**: quick-mode
> **作成日**: 2026-03-20

## 1. テストヘルパー

H10-04はSKILL.mdドキュメントの存在確認が主体のため、ファイルシステム確認を使用する。

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
```

## 2. テストケース疑似コード

```typescript
describe('H10-04: quick-implementor SKILL.md', () => {
  const skillPath = join(ROOT, 'docs/skills/quick-implementor/SKILL.md');

  // SC-H10-04-001
  it('quick-implementor SKILL.mdが存在する', () => {
    // Arrange: なし
    // Act
    const actual = existsSync(skillPath);
    // Assert
    expect(actual).toBe(true);
  });

  // SC-H10-04-002
  it('SKILL.mdにQuick Mode判定への参照が含まれる', () => {
    // Arrange
    const content = readFileSync(skillPath, 'utf-8');
    // Act
    const actual = content;
    // Assert
    expect(actual).toMatch(/quick.mode|QuickMode|quick-check/i);
  });

  // SC-H10-04-003
  it('SKILL.mdにAtomic commitへの言及が含まれる', () => {
    // Arrange
    const content = readFileSync(skillPath, 'utf-8');
    // Act
    const actual = content;
    // Assert
    expect(actual).toMatch(/atomic\s+commit|Atomic\s+Commit/i);
  });
});
```

## 3. テスト実行コマンド

```bash
# ドキュメント存在確認（手動）
ls docs/skills/quick-implementor/SKILL.md

# 全テストスイート
npx vitest run
```
