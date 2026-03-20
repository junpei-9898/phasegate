---
name: scenario-test-logic-designer
description: シナリオテストケース設計を元にPlaywright実装ロジックを設計 - E2Eテストの疑似コード・セレクタ戦略・シードデータ付き詳細設計
model: sonnet
review: opus
---

# Scenario Test Logic Designer

シナリオテストケース設計（`scenario_test_design.md`）を元に、Playwright実装ロジックを詳細設計するスキル。テストケース設計フェーズとTDD実装フェーズの間に位置し、E2Eテストの設計を行う。

## 実行タイミング

```
テストケース設計フェーズ
  unit-test-designer → it-test-designer → scenario-test-designer
                          ↓
              test-coverage-checker
                          ↓
  unit-test-logic-designer → it-test-logic-designer
                          ↓
┌────────────────────────────────────────────┐
│  scenario-test-logic-designer（本スキル）    │ ← ここで実行
└────────────────────────────────────────────┘
                          ↓
TDD実装フェーズ
  story-implementor
```

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **シナリオテストケース設計** — `docs/inception/{unit}/{story_id}/scenario_test_design.md`
- **論理設計** — `docs/inception/{unit}/{story_id}/logical_design.md`

### 推奨インプット（あれば参照）
- **カバレッジレポート** — `docs/product/construction/{unit}/coverage_report.md`
- **既存シナリオテスト** — `e2e/tests/**/*.spec.ts`（パターン参考）
- **UIUX設計** — `docs/inception/{unit}/{story_id}/uiux_design.md`
- **テスト規約** — `docs/principles/testing_rules.md`

---

## ⚠️ 上位レイヤー存在チェック

**このスキルはテストケース設計完了後、TDD実装前に実行します。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/inception/{unit}/{story_id}/scenario_test_design.md` | ✅ 必須 | シナリオテストケース設計の存在を確認 |
| `docs/inception/{unit}/{story_id}/logical_design.md` | ✅ 必須 | 論理設計の存在を確認 |
| `docs/product/construction/{unit}/coverage_report.md` | 📋 推奨 | カバレッジ検証済みか確認 |

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**ロジック設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（scenario-test-designer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断でロジック設計を開始しない

---

## ⚠️ 3フェーズ実行ルール

**このスキルは3フェーズで実行する。**
- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: Sonnet 4.6 に委任して成果物を生成する（`scripts/delegate-sonnet.sh` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## Phase 1: 計画（plan）

### 目的
ロジック設計のスコープ・テストファイル構成・セレクタ戦略・シードデータを整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/{story_id}/scenario_test_logic_plan.md`

### 計画ファイルの構成

```markdown
# シナリオテストロジック設計計画: {ストーリーID}

## 1. スコープ
- 対象テストケース設計: scenario_test_design.md
- テストシナリオ総数: X件

## 2. テストファイル構成（計画）

| テストファイル | シナリオ | ケース数 |
|--------------|---------|---------|
| `{story_id}-{feature}.spec.ts` | {シナリオ名} | X |

## 3. セレクタ戦略
- data-testid命名規約
- 既存コンポーネントの再利用

## 4. シードデータ設計
| データセット | 用途 | テーブル |
|------------|------|---------|

## 5. MSWモック設計（必要な場合）
| エンドポイント | モック内容 |
|--------------|----------|

## 6. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

## 7. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **ロジック設計文書はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **テストファイル構成の決定** — ファイル配置と命名規約
2. **各シナリオの疑似コード設計** — ステップ・アサーション・待機戦略
3. **セレクタ戦略の設計** — data-testid・ロケーター
4. **シードデータの設計** — 初期データ・クリーンアップ
5. **MSWモックの設計** — APIモック（必要な場合）

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| ケース網羅 | scenario_test_design.mdの全シナリオに対応する疑似コードがあること |
| ステップコメント | 各テストに「Step N: 操作内容」形式のコメントがあること |
| セレクタ定義 | 使用するdata-testidが一覧として定義されていること |
| 待機戦略 | ページ遷移・API応答・要素表示の待機方法が具体的に設計されていること |
| クリーンアップ | try/finallyパターンでのクリーンアップが設計されていること |
| テスト実行コマンド | テスト実行方法（通常・headed・UIモード）が記載されていること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `docs/inception/{unit}/{story_id}/scenario_test_logic.md` |

### scenario_test_logic.md の構成

```markdown
# シナリオテストロジック設計: {ストーリーID}

## 1. テストファイル構成

| ファイルパス | シナリオ | ケース数 |
|------------|---------|---------|
| `e2e/tests/{context}/{story_id}-{feature}.spec.ts` | {シナリオ名} | X |

## 2. ヘルパー・シードデータ

### ヘルパーのインポート

```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../../helpers/auth-helper';
import { TEST_USERS } from '../../helpers/test-users';
import { cleanup{Entity} } from '../../helpers/{context}-helper';
```

### シードデータ設計

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

## 3. シナリオテスト詳細ロジック

### SC-001: {シナリオ名}

#### ファイル: `{story_id}-{feature}.spec.ts`

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

### SC-002: {別シナリオ名}

（同様の構造で記述）

## 4. セレクタ戦略

### data-testid命名規約

| 要素タイプ | 命名パターン | 例 |
|----------|------------|---|
| ページコンテナ | `{page}-container` | `client-list-container` |
| テーブル行 | `{entity}-row-{id}` | `client-row-001` |
| ボタン | `{action}-{target}-button` | `submit-create-process-button` |
| 入力フィールド | `{field}-input` | `process-label-input` |
| ステータス表示 | `{entity}-{property}` | `process-status` |
| エラーメッセージ | `{field}-error` | `amount-error` |

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

## 5. 待機戦略

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

## 6. MSWモック設計（必要な場合）

```typescript
// e2e/mocks/{context}/handlers.ts
import { http, HttpResponse } from 'msw';

export const {context}Handlers = [
  // 正常系モック
  http.get('/api/{endpoint}', () => {
    return HttpResponse.json({
      data: { /* モックデータ */ },
    });
  }),

  // エラー系モック
  http.post('/api/{endpoint}', () => {
    return HttpResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '...' } },
      { status: 400 }
    );
  }),
];
```

## 7. ヘルパー関数設計

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
```

---

## 設計原則

### 1. ステップコメントの徹底
```typescript
// Step 1: ダッシュボードからクライアント一覧へ遷移
await page.goto('/dashboard');

// Step 2: クライアントを選択
await page.click('[data-testid="client-row-001"]');

// Step 3: 結果を確認
await expect(page.getByTestId('client-name')).toHaveText('テストクライアント');
```

### 2. try/finallyパターン
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

### 3. 既存パターンの踏襲
- `loginAsUser()` でログイン処理を共通化
- `TEST_USERS` で認証情報を管理
- ヘルパー関数でクリーンアップを共通化

### 4. 疑似コードの粒度
- 実装エージェントが迷わないレベルの詳細さ
- 具体的なセレクタ・URL・待機時間を記載
- エッジケースのテストパターンを明示

---

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（Opus 4.6）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` のレビュー観点 R1〜R7 に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] scenario_test_design.mdの全シナリオに対応する疑似コードが存在するか
- [ ] セレクタ戦略がdata-testid優先で設計されているか（CSSセレクタを避けているか）
- [ ] 待機戦略が明示的か（固定sleep()ではなくwaitForURL/waitForLoadState等を使用）
- [ ] クリーンアップがtry/finallyで確実に実行される設計か
- [ ] UIUX設計との整合性が取れているか（data-testid名の一致等）

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **テストコードは生成しない**（設計文書のみ）— 実装は `story-implementor` スキル（codex-delegator経由、またはメインセッションで直接実行）が行う
- 疑似コードは実装の指針となる詳細レベルで記載する
- TDDの「RED」フェーズで正しく失敗するテストを設計する
- 既存のテストパターン（`e2e/tests/**/*.spec.ts`）を参照してスタイルを統一する
- クリーンアップを確実に行い、テスト間の独立性を保つ

---

## 次ステップへの誘導

シナリオテストロジック設計完了後、以下のスキルに進んでください：

1. **TDD実装** — 全テストロジック設計完了後
   - `story-implementor` でTDDサイクル（Unit → IT → E2E）を実行
