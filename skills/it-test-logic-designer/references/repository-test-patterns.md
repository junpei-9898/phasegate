# Repository テストパターン・テンプレート

本ファイルは `it-test-logic-designer` スキルで使用するRepositoryレイヤーのテストテンプレート集。
シードデータ設計・トランザクション・クリーンアップ戦略を含む。

> **配置パス・DB クライアント・実行コマンドについて:** 以下のテスト配置ディレクトリ（`backend/test/seeds/` 等）・テスト実行コマンドは対象プロジェクトの構成（`package.json` scripts, vitest 設定, `phasegate.config.json` の paths）から特定すること。`getTestClient` / `SupabaseClient` / `supabase-test-helper.js` はプロジェクトが採用する DB/BaaS のテスト用ヘルパーに読み替える（以下は Supabase プロジェクト向けの実装例）。テンプレート構造自体はそのまま流用してよい。

---

## テストヘルパーのインポート

以下は例（Supabase プロジェクトの場合）。DB/BaaS ヘルパーはプロジェクトの採用技術に読み替える。

```typescript
import { target, context } from '../../helpers/common-helper.js';
import { getTestClient, cleanupTestData } from '../../helpers/supabase-test-helper.js';
```

## シードデータ設計テンプレート

```typescript
// 例（モノレポ構成の場合）: backend/test/seeds/{context}/{seed-name}.ts
// SupabaseClient 型はプロジェクトが採用する DB/BaaS のクライアント型に読み替える

export const {SEED_NAME}_SEED = {
  // テストデータ定義
  organizations: [
    { id: 'org-001', name: 'テスト組織' },
  ],
  users: [
    { id: 'user-001', organizationId: 'org-001', name: 'テストユーザー' },
  ],
};

export async function seed{SeedName}(client: SupabaseClient): Promise<void> {
  // INSERT処理
}

export async function cleanup{SeedName}(client: SupabaseClient): Promise<void> {
  // DELETE処理
}
```

---

## Repository テストテンプレート

### ファイル: `{repository}.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { target, context } from '../../helpers/common-helper.js';
import { getTestClient, cleanupTestData } from '../../helpers/supabase-test-helper.js';
import { {Repository} } from '../../../src/{context}/infrastructure/repositories/{repository}.js';

target('{Repository}', () => {
  let repository: {Repository};
  const idsToCleanup: string[] = [];

  beforeAll(() => {
    repository = new {Repository}(getTestClient());
  });

  afterEach(async () => {
    for (const id of idsToCleanup) {
      await cleanupTestData(id);
    }
    idsToCleanup.length = 0;
  });

  // IT-REPO-{Name}-001: 保存テスト
  describe('save', () => {
    context('新規エンティティを保存する場合', () => {
      it('DBに永続化される', async () => {
        // Arrange
        const entity = create{Entity}({
          // テストデータ
        });
        idsToCleanup.push(entity.id);

        // Act
        await repository.save(entity);

        // Assert — DBから直接確認
        const client = getTestClient();
        const { data: row } = await client
          .from('{table_name}')
          .select('*')
          .eq('id', entity.id)
          .single();

        expect(row).not.toBeNull();
        expect(row!.{column}).toBe({expectedValue});
      });
    });
  });

  // IT-REPO-{Name}-002: 取得テスト
  describe('findById', () => {
    context('存在するIDで取得する場合', () => {
      it('エンティティが再構築される', async () => {
        // Arrange
        const entity = create{Entity}({ /* ... */ });
        await repository.save(entity);
        idsToCleanup.push(entity.id);

        // Act
        const actual = await repository.findById(entity.id);

        // Assert
        expect(actual).not.toBeNull();
        expect(actual!.id).toBe(entity.id);
        expect(actual!.{property}).toBe({expectedValue});
      });
    });

    context('存在しないIDで取得する場合', () => {
      it('nullが返される', async () => {
        // Act
        const actual = await repository.findById(to{Entity}Id('non-existent-id'));

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // IT-REPO-{Name}-003: 更新テスト
  describe('update', () => {
    it('既存エンティティが更新される', async () => {
      // Arrange
      const entity = create{Entity}({ /* 初期値 */ });
      await repository.save(entity);
      idsToCleanup.push(entity.id);

      // Act
      entity.updateXxx({newValue});
      await repository.save(entity);

      // Assert
      const actual = await repository.findById(entity.id);
      expect(actual!.{property}).toBe({newValue});
    });
  });
});
```

---

## トランザクション・クリーンアップ戦略

### クリーンアップパターン

```typescript
// テスト毎にクリーンアップ
afterEach(async () => {
  for (const id of idsToCleanup) {
    await cleanupTestData(id);
  }
  idsToCleanup.length = 0;
});
```

### トランザクション分離

```typescript
// トランザクション内でテスト実行（ロールバック）
describe('トランザクションテスト', () => {
  it('エラー時にロールバックされる', async () => {
    // Arrange
    const client = getTestClient();

    // Act
    try {
      await client.rpc('test_transaction', { /* ... */ });
    } catch (e) {
      // Expected error
    }

    // Assert — ロールバックされていることを確認
    const { data } = await client.from('{table}').select('*');
    expect(data).toHaveLength(0);
  });
});
```

### DB直接確認パターン

```typescript
// Assert — DBから直接確認
const client = getTestClient();
const { data: row } = await client
  .from('{table}')
  .select('*')
  .eq('id', entity.id)
  .single();
expect(row).not.toBeNull();
```

## テスト実行コマンド

実行コマンドは対象プロジェクトの構成（`package.json` scripts, vitest 設定, `phasegate.config.json` の paths）から特定する。以下は例（pnpm モノレポ構成の場合）。

```bash
# 全ITテスト実行
pnpm --filter backend test:integration

# 特定ファイルのみ
pnpm --filter backend test:integration -- {repository}.test.ts

# watchモード
pnpm --filter backend test:integration -- --watch
```
