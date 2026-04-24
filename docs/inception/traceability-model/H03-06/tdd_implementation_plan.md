# TDD 実装計画: H03-06 WorkItem 物理レイアウト移行 dry-run

@story-id H03-06
設計要素: ISSUE-026 Phase B-1 として、旧 issue レイアウトを WI レイアウトへ移行する dry-run plan を生成する。

- **対応ストーリー**: H03-06
- **対応 Issue**: ISSUE-026 (Phase B-1)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. スコープ

### 1.1 対象ストーリー受け入れ基準

- `docs/inception/issues/{ISSUE-XXX}` が `_cross/{WI-XXX}` への候補として列挙される
- `docs/inception/{unit}/issues/{ISSUE-XXX}` が `{unit}/{WI-XXX}` への候補として列挙される
- `legacy_id` と `id` の frontmatter 追記計画が返る
- 移動先衝突を検出できる
- dry-run ではファイルシステムを書き換えない

### 1.2 非対象

- 実ファイル移動
- CLI command の公開
- gate ロジック刷新
- story ID (`HXX-XX`) の WI 化

## 2. 影響する層

| 層 | 影響 | 新規/変更ファイル |
|---|------|------------------|
| domain | あり | migration candidate value object / planning service |
| application | あり | plan migration usecase |
| infrastructure | あり | file-system inception work item gateway |
| presentation | なし | 後続 H03-07 |
| テスト | あり | unit tests for planner/usecase |

## 3. TDD 実装順序

### Step 3.1 Domain service RED

- cross-unit issue が `_cross/WI-XXX` に変換される
- unit-owned issue が `{unit}/WI-XXX` に変換される
- target path 既存時に conflict が立つ

### Step 3.2 Domain service GREEN

ID 変換と path 変換を pure function として実装する。filesystem 依存は持たせない。

### Step 3.3 Application usecase RED

fixture filesystem を読み、candidate と warning を返すテストを追加する。

### Step 3.4 Infrastructure GREEN

旧 issue layout の directory scan と target existence check を port 実装へ閉じ込める。

### Step 3.5 回帰確認

```bash
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/traceability-model
pnpm harness:status
```
