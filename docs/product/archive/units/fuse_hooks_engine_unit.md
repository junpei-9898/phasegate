# Unit定義: fuse-hooks-engine

> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-10
> **Wave**: 4（高度機能）
> **対応Epic**: E-12 FUSE Hooks Engine（L0 Pre-write enforcement）

---

## 1. 概要

OS-level FUSEによるファイルI/Oインターセプションで、AIエージェントの種類やプロンプト遵守度に依存しない決定論的ガバナンスを実現するUnit。.harness-hooks.ymlによる宣言的フック定義、PreWrite/PostWrite/PreRead/PreBash/OnCompleteハンドラ、完了ゲートを実装する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-040 | .harness-hooks.ymlによる宣言的フック定義 | Must |
| US-041 | FUSEパススルーファイルシステム+PreWrite/PostWriteハンドラ実装 | Must |
| US-042 | PreRead Hookによる機密ファイルアクセスブロック | Must |
| US-043 | シェルラッパーによるPreBash/PostBash Hook実現 | Must |
| US-044 | 完了ゲート（Magic File + CLI）によるStop Hook相当のFUSE実現 | Must |

---

## 3. 機能要件

### 3.1 .harness-hooks.yml

- 宣言的フック定義スキーマ
- フック種別: PreWrite / PostWrite / PreRead / PreBash / OnComplete
- ファイルパターン（glob）+ アクション（block / allow / run）

### 3.2 FUSEパススルー + PreWrite/PostWrite

- FUSE-T（macOS）/ libfuse（Linux）パススルーファイルシステム
- PreWrite: レイヤー違反ファイル書き込みのEPERM拒否
- PreWrite: 設計文書なしの実装コード書き込み拒否
- PostWrite: ファイル書き込み直後のバリデータ自動起動
- FUSE未使用時のL1-L4フォールバック

### 3.3 PreRead Hook

- `.env`、`*.key`、`*.pem`等の機密ファイル読み取りブロック
- ブロック対象ファイルパターンの.harness-hooks.yml設定
- FUSE未使用時のClaude Code PreToolUse Hookによる同等の機密ファイルアクセスブロック

### 3.4 PreBash/PostBash

- シェルラッパー（PATH override）で主要コマンドインターセプト
- 破壊的コマンド（`rm -rf /`、`git push --force`等）ブロック
- FUSE未使用時のClaude Code deny-check.shフォールバック

### 3.5 完了ゲート

- Magic File（`.harness/DONE`）書き込みトリガーの完了ゲート
- `pnpm test`全グリーン検証
- テスト未通過時のEPERM拒否
- CLI（`harness:complete`）での同等機能
- FUSE未使用時のClaude Code Stop Hookフォールバック

---

## 4. データモデル概要

- **.harness-hooks.yml**: 宣言的フック定義YAML
- **FUSEマウントポイント**: パススルーファイルシステムのマウント設定
- **Magic File**: `.harness/DONE`（完了ゲートトリガー）

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| config-foundation | 設定 | phasegate.config.json v2の設定参照 |
| quality-hooks | パターン | Stop Hookテストゲート・無限ループ防止の参照実装 |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| 設定ファイル | `.harness-hooks.yml` | 外部利用者 |
| CLI | `harness:complete` | 外部利用者 |
| L0バリデーション | PreWrite/PreRead/PreBash enforcement | 全Unit（FUSE利用時） |
