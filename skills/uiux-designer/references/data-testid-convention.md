# data-testid 命名規約（正規リファレンス）

> **このファイルが data-testid 命名規約の Single Source of Truth です。**
> 他スキル（scenario-test-logic-designer 等）からはこのファイルを参照してください。

## 命名パターン

| 要素タイプ | 命名パターン | 例 |
|----------|------------|---|
| ページコンテナ | `{page}-container` | `client-list-container` |
| テーブル行 | `{entity}-row-{id}` | `client-row-001` |
| ボタン | `{action}-{target}-button` | `submit-create-process-button` |
| 入力フィールド | `{field}-input` | `process-label-input` |
| ステータス表示 | `{entity}-{property}` | `process-status` |
| エラーメッセージ | `{field}-error` | `amount-error` |

## ロケーター優先順位

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

## 命名の原則

- **kebab-case** を使用する（camelCase や snake_case は不可）
- **具体的で一意** — ページ内で重複しない名前をつける
- **実装詳細を含めない** — CSS クラス名やコンポーネント内部名を避ける
- **ユーザー視点** — 機能・役割ベースで命名する
