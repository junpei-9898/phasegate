# Unit定義: biome-toolchain

> **Unit ID**: biome-toolchain
> **作成日**: 2026-03-10
> **Wave**: 1（基盤構築）
> **対応Epic**: E-11 ESLint→Biome全面移行

---

## 1. 概要

v0のESLintベースの4カスタムルールをBiomeプラグインとして移植し、PostToolUse Hook高速化、L1バリデータ再構築、CIパイプラインのBiome統合を行うUnit。Phasegate v1のコード品質基盤（L1レイヤー）を確立する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-036 | v0カスタムESLintルールのBiomeプラグイン移植 | Must |
| US-037 | PostToolUse HookのBiomeベース高速化 | Must |
| US-038 | L1バリデータのBiomeベース再構築 | Must |
| US-039 | CIパイプラインのBiome統合 | Must |

---

## 3. 機能要件

### 3.1 Biomeプラグイン移植（4ルール）

- `require-unit-comment`: ソースファイルに@unitコメント必須
- `require-layer-comment`: ソースファイルに@layerコメント必須
- `no-layer-violation`: importグラフ解析 + 循環依存検出
- `enforce-folder-structure`: フォルダ構造のアーキテクチャ準拠検証

### 3.2 PostToolUse Hook高速化

- `biome check` / `biome format` ベースに切り替え
- v0のformat-typescript-hook.shと同等機能のBiome実現

### 3.3 L1バリデータ再構築

- Biome AST解析ベースの動作
- AI生成コードアンチパターン検出: any型乱用 / コード重複 / ゴーストファイル / コメント洪水

### 3.4 CIパイプライン統合

- aidlc-gate.yml相当でBiomeリント+フォーマットチェック実行
- ESLint関連の設定・依存パッケージの完全除去
- CI失敗時のHarnessError形式準拠

---

## 4. データモデル概要

- **Biome設定**: `biome.json`（ルール定義）
- **Biomeプラグイン**: カスタムルール実装コード
- **CIワークフロー**: `.github/workflows/aidlc-gate.yml`

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| なし（基盤Unit） | — | 他Unitに依存しない |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| Biomeルール | require-unit-comment / require-layer-comment / no-layer-violation / enforce-folder-structure | 全Unit（L1バリデーション） |
| Hook | PostToolUse Biomeフォーマット | 全Unit（開発ループ） |
| CI | Biome統合CIパイプライン | regression-suite |
