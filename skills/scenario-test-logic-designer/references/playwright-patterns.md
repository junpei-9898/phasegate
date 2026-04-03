# Playwright テストパターン集

scenario-test-logic-designer スキルで使用する Playwright テストパターンの詳細リファレンス。

---

## 1. セレクタ戦略

### ロケーター優先順位

1. `data-testid` — 最優先（テスト専用属性）
2. `role` — セマンティックなロケーター
3. `text` — 表示テキスト
4. `css/xpath` — 最終手段（避ける）

```typescript
// 推奨
await page.getByTestId('submit-button').click();
await page.getByRole('button', { name: '保存' }).click();

// 非推奨
await page.click('button.primary'); // CSSセレクタ
```

> **data-testid の命名規則は `uiux-designer` スキルを参照。**

---

## 2. 待機戦略

### ページ遷移待機

```typescript
// URLパターンで待機
await page.waitForURL('**/processes/**', { timeout: 10000 });

// ネットワーク安定待機
await page.waitForLoadState('networkidle');
```

### 要素表示待機

```typescript
// 要素の可視化待機
await expect(page.getByTestId('result')).toBeVisible({ timeout: 5000 });

// テキスト変化待機
await expect(page.getByTestId('status')).toHaveText('完了', { timeout: 10000 });
```

### API応答待機

```typescript
// 特定APIの応答を待機
const responsePromise = page.waitForResponse('**/api/process');
await page.click('[data-testid="submit-button"]');
const response = await responsePromise;
expect(response.ok()).toBe(true);
```

---

## 3. ステップコメントパターン

```typescript
// Step 1: ダッシュボードからクライアント一覧へ遷移
await page.goto('/dashboard');

// Step 2: クライアントを選択
await page.click('[data-testid="client-row-001"]');

// Step 3: 結果を確認
await expect(page.getByTestId('client-name')).toHaveText('テストクライアント');
```

---

## 4. try/finally クリーンアップパターン

```typescript
test('テスト', async ({ page }) => {
  let createdId: string | undefined;
  try {
    // テスト実行
    createdId = await createEntity(page);
    // ...
  } finally {
    // 必ずクリーンアップ
    if (createdId) await cleanupEntity(page, createdId);
  }
});
```

---

## 5. テストファイル テンプレート

```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../../helpers/auth-helper';
import { TEST_USERS } from '../../helpers/test-users';
import { cleanup{Entity} } from '../../helpers/{context}-helper';

/**
 * {ストーリーID}: {シナリオ概要}
 * {業務フローの説明}
 */

test.describe('{ストーリーID}: {シナリオ名}', () => {
  let entityId: string | undefined;

  test.beforeEach(async ({ page }) => {
    // 認証済みユーザーでログイン
    await loginAsUser(page, TEST_USERS.{role}.email, TEST_USERS.{role}.password);
  });

  test.afterEach(async ({ page }) => {
    // クリーンアップ
    if (entityId) {
      await cleanup{Entity}(page, entityId);
    }
  });

  test('{テストケース名}', async ({ page }) => {
    try {
      // Step 1: {画面遷移または操作}
      await page.goto('/{path}');
      await page.waitForLoadState('networkidle');

      // Step 2: {操作}
      await page.click('[data-testid="{element-name}"]');
      await page.waitForURL('**/{expected-path}', { timeout: 10000 });

      // Step 3: {入力}
      await page.fill('[data-testid="{input-name}"]', '{入力値}');
      await page.click('[data-testid="{submit-button}"]');

      // Step 4: {結果確認}
      await expect(page.getByTestId('{result-element}')).toBeVisible();
      await expect(page.getByTestId('{result-element}')).toHaveText('{期待テキスト}');

      // URLからIDを取得（クリーンアップ用）
      const url = page.url();
      entityId = url.split('/').pop();

      // Step 5: {追加検証}
      await expect(page.getByTestId('{status}')).toHaveText('{期待ステータス}');

    } finally {
      // エラー時もクリーンアップ実行
      if (entityId) {
        await cleanup{Entity}(page, entityId);
        entityId = undefined;
      }
    }
  });

  test('{異常系テストケース名}', async ({ page }) => {
    // Step 1: {異常系操作}
    await page.goto('/{path}');

    // Step 2: {不正な入力}
    await page.fill('[data-testid="{input-name}"]', '{不正な値}');
    await page.click('[data-testid="{submit-button}"]');

    // Step 3: {エラー表示確認}
    await expect(page.getByTestId('{error-message}')).toBeVisible();
    await expect(page.getByTestId('{error-message}')).toContainText('{期待エラーメッセージ}');
  });
});
```

---

## 6. シードデータ テンプレート

```typescript
// e2e/seeds/{context}/{seed-name}.ts

export const {SEED_NAME}_SEED = {
  // シナリオ実行前に必要なデータ
  {entity}: {
    id: '{entity}-001',
    // ...
  },
};

export async function seed{SeedName}(): Promise<void> {
  // Supabase CLIまたはAPIでデータ投入
}

export async function cleanup{SeedName}(): Promise<void> {
  // クリーンアップ処理
}
```

---

## 7. ヘルパー関数 テンプレート

```typescript
// e2e/helpers/{context}-helper.ts

/**
 * テスト用{Entity}のクリーンアップ
 */
export async function cleanup{Entity}(page: Page, entityId: string): Promise<void> {
  // 管理画面経由でデータ削除
  // または直接APIコール
}

/**
 * テスト用{Entity}の作成
 */
export async function create{Entity}(page: Page, data: {Entity}Data): Promise<string> {
  // UI操作またはAPIでエンティティ作成
  // 作成されたIDを返す
}
```

---

## 8. テスト実行コマンド

```bash
# 全シナリオテスト実行
pnpm --filter e2e test

# 特定ファイルのみ
pnpm --filter e2e test -- {story_id}-{feature}.spec.ts

# デバッグモード（ブラウザ表示）
pnpm --filter e2e test -- --headed

# UI モード
pnpm --filter e2e test -- --ui
```
