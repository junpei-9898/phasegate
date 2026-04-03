# テストパターン・テンプレート集

unit-test-logic-designer が出力する `unit_test_logic.md` で使用するテストパターンのリファレンス。

---

## 1. ファクトリ関数パターン

```typescript
// backend/test/helpers/{context}-helper.ts

/**
 * {集約名}のテスト用ファクトリ
 */
export function create{Aggregate}(overrides?: Partial<{Aggregate}Props>): {Aggregate} {
  return {Aggregate}.create({
    // デフォルト値
    id: to{Aggregate}Id('test-001'),
    name: 'テスト',
    ...overrides,
  });
}
```

### 共通ヘルパーのインポート

```typescript
import { target, context } from '../../../../helpers/common-helper.js';
```

---

## 2. 集約（Aggregate）テストテンプレート

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../../helpers/common-helper.js';
import { {Aggregate} } from '../../../../../src/{context}/domain/aggregates/{aggregate}.js';

target('{Aggregate}', () => {
  // UT-{Aggregate}-001: 不変条件テスト
  describe('{不変条件の説明}', () => {
    it('{期待される振る舞い}', () => {
      // Arrange
      const props = {
        // テストデータ
      };

      // Act
      const actual = {Aggregate}.create(props);

      // Assert
      expect(actual.{property}).toBe({expectedValue});
    });

    context('{特定の条件}の場合', () => {
      it('{期待される結果}', () => {
        // Arrange
        const invalidProps = {
          // 不正なデータ
        };

        // Act & Assert
        expect(() => {Aggregate}.create(invalidProps)).toThrow({ExpectedError});
      });
    });
  });

  // UT-{Aggregate}-002: 状態遷移テスト
  describe('{状態遷移の説明}', () => {
    it('{初期状態}から{操作}で{期待状態}に遷移する', () => {
      // Arrange
      const aggregate = create{Aggregate}({ status: '{初期状態}' });

      // Act
      aggregate.{operation}();

      // Assert
      expect(aggregate.status).toBe('{期待状態}');
    });
  });
});
```

---

## 3. 値オブジェクト（ValueObject）テストテンプレート

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../../helpers/common-helper.js';
import { {ValueObject} } from '../../../../../src/{context}/domain/value-objects/{value-object}.js';

target('{ValueObject}', () => {
  // UT-VO-{Name}-001: 生成テスト
  describe('{ValueObject}を生成する', () => {
    it('有効な値で生成できる', () => {
      // Arrange
      const value = '{有効な値}';

      // Act
      const actual = {ValueObject}.create(value);

      // Assert
      expect(actual.value).toBe(value);
    });

    context('無効な値の場合', () => {
      it.each([
        ['空文字', ''],
        ['null', null],
        ['{境界値}', '{境界値の例}'],
      ])('%sの場合エラーになる', (_, invalidValue) => {
        // Act & Assert
        expect(() => {ValueObject}.create(invalidValue)).toThrow();
      });
    });
  });

  // UT-VO-{Name}-002: 等値性テスト
  describe('等値性', () => {
    it('同じ値を持つ{ValueObject}は等しい', () => {
      // Arrange
      const vo1 = {ValueObject}.create('{値}');
      const vo2 = {ValueObject}.create('{値}');

      // Act & Assert
      expect(vo1.equals(vo2)).toBe(true);
    });
  });
});
```

---

## 4. モック戦略

### vi.mock の使用パターン

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 外部依存のモック
vi.mock('../../../../../src/{context}/infrastructure/{dependency}.js', () => ({
  {DependencyClass}: vi.fn().mockImplementation(() => ({
    {method}: vi.fn().mockResolvedValue({mockValue}),
  })),
}));
```

### モック不要のケース
- 純粋なドメインロジック（Entity, ValueObject）
- 状態遷移ロジック
- 計算ロジック

### モック必要のケース
- インフラ層への依存がある場合
- 外部APIへの依存がある場合

---

## 5. AAA パターン詳細

全テストケースは **AAA（Arrange / Act / Assert）** パターンで構造化する。

- **Arrange**: テストデータの準備
- **Act**: テスト対象の実行
- **Assert**: 結果の検証

```typescript
// Arrange
const data = ...;

// Act
const actual = target.method(data);

// Assert
expect(actual).toBe(expected);
```

コメント `// Arrange`, `// Act`, `// Assert` を必ず記載し、各セクションの境界を明示する。

---

## 6. 境界値テスト一覧テンプレート

| ケースID | 対象 | 境界条件 | 入力例 | 期待結果 |
|---------|------|---------|-------|---------|
| UT-BV-001 | {ValueObject} | 最小値 | 0 | 成功 |
| UT-BV-002 | {ValueObject} | 最小値-1 | -1 | エラー |
| UT-BV-003 | {ValueObject} | 最大値 | 100 | 成功 |
| UT-BV-004 | {ValueObject} | 最大値+1 | 101 | エラー |

---

## 7. テスト実行コマンド

```bash
# 全ユニットテスト実行
pnpm --filter backend test:unit

# 特定ファイルのみ
pnpm --filter backend test:unit -- {aggregate}.test.ts

# watchモード
pnpm --filter backend test:unit -- --watch
```
