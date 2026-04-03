# Unit定義: quality-hooks

> **Unit ID**: quality-hooks
> **作成日**: 2026-03-10
> **Wave**: 2（コア品質機構）
> **対応Epic**: E-05 品質ハーネス強化（Hooks拡張）

---

## 1. 概要

Claude Code Hooks層（PreToolUse / Stop Hook）を拡張し、リンター設定保護、テストゲート、無限ループ防止、ci-check追加を実現するUnit。fuse-hooks-engine Unitの前提となるClaude Code Hooksベースの品質ゲートを確立する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-016 | PreToolUse Hookによるリンター設定保護 | Must |
| US-017 | Stop Hookテストゲートの追加 | Must |
| US-018 | Stop Hookテストゲートの無限ループ防止 | Must |
| US-019 | Stop Hookへのphasegate:ci-check追加 | Should |

---

## 3. 機能要件

### 3.1 PreToolUse Hookリンター設定保護

- `biome.json`、`tsconfig.json`、`package.json`の変更ブロック
- ブロック時に変更対象ファイル名を含むエラーメッセージ
- ブロック対象外ファイルの正常変更保証

### 3.2 Stop Hookテストゲート

- Stop Hook実行時に`pnpm test`自動実行
- テスト失敗時にStop Hook失敗 → エージェント完了阻止
- テスト全グリーン時のStop Hook正常終了

### 3.3 無限ループ防止

- `stop_hook_active`フラグによるStop Hook再入検出
- 再入検出時のスキップ + 警告メッセージ
- Stop Hook正常終了時のフラグリセット

### 3.4 ci-check追加（Should）

- Stop Hook内で`phasegate:ci-check`を`pnpm test`に続けて実行
- phasegate:ci-check失敗時のStop Hook失敗
- 無限ループ防止機構の適用

---

## 4. データモデル概要

- **Claude Code Hooks設定**: `.claude/settings.json` 内のhooks定義
- **stop_hook_activeフラグ**: 一時ファイルまたは環境変数

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| なし | — | Wave 2として独立着手可能（Claude Code Hooksは既存機構の拡張） |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| Hook | PreToolUse リンター設定保護 | 全Unit（開発時） |
| Hook | Stop Hook テストゲート + 無限ループ防止 | fuse-hooks-engine（FUSE完了ゲートの参照実装） |
| パターン | stop_hook_activeフラグ機構 | fuse-hooks-engine |
