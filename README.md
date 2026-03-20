# GSDLC Harness

**Governed Software Development Life Cycle — Engineering Toolkit**

AIエージェント（Claude Code）と人間が協働してプロダクション品質のソフトウェアを構築するための、品質ゲート・設計プロセス・スキルセットを一体化したエンジニアリングツールキットです。

---

## 何ができるのか

| 機能 | 説明 |
|---|---|
| **AIDLCプロセス** | 設計→テスト設計→実装の順序を強制するスキル群（25スキル） |
| **品質ゲート (L1〜L4)** | 構文・アーキテクチャ・整合性・スケジュール検査 |
| **CLIコマンド** | lint / validate / ci-check などを `npx harness` で実行 |
| **npmパッケージ配布** | 他プロジェクトに `npm install` するだけで全スキルと品質ゲートが使える |

---

## 前提条件

- Node.js 18+
- npm 9+

---

## 新規プロジェクトへの導入手順

### 1. インストール

本パッケージはnpmには公開していません。以下のいずれかの方法でインストールしてください。

**GitHubリポジトリから（推奨）**

```bash
npm install --save-dev "github:junpei-9898/GSDLC_HARNESS#v1.1.0"
```

package.json に直接記載する場合:
```json
"devDependencies": {
  "gsdlc-harness": "github:junpei-9898/GSDLC_HARNESS#v1.1.0"
}
```

### 2. 初期化

```bash
npx harness init --name <プロジェクト名>
```

実行すると以下が自動生成されます:

- `.claude/skills/` — 25個のAIDLCスキル
- `harness.config.json` — ハーネス設定ファイル

### 3. 必須ドキュメントをコピーする

以下の3ファイルをプロジェクトの `docs/` に配置してください（GSDLC_HARNESSからコピーするか、プロジェクトに合わせて新規作成）。

```
docs/
├── folder_management_rules.md      # ドキュメント配置ルール
└── principles/
    ├── architecture-philosophy.md  # アーキテクチャ哲学
    └── testing-rules.md            # テスト規約
```

GSDLC_HARNESSからコピーする場合:
```bash
cp node_modules/gsdlc-harness/docs/folder_management_rules.md docs/
mkdir -p docs/principles
cp node_modules/gsdlc-harness/docs/principles/*.md docs/principles/
```

### 4. プロダクト概要を配置する

```
docs/product/
└── <your_product>_overview.md   # プロダクト定義（AIDLCの入力）
```

### 5. Claude Codeを起動してAIDLCを開始する

```bash
claude  # プロジェクトルートで新セッションを起動
```

セッション内で `/product-architect` を実行してAIDLCを開始します。

---

## AIDLCプロセス（スキル実行順序）

AIDLC（AI-Driven Development Life Cycle）は、設計文書が存在しない状態での実装を禁止するプロセスです。

```
Level 1: 要求定義
  /product-architect    プロダクト全体像の定義
  /story-writer         ユーザーストーリー作成
  /story-mapper         MVPスコープ整理・優先順位定義
  /unit-designer        ストーリーをUnitにグルーピング

Level 2: 設計
  /domain-designer      ドメインモデル設計（集約・エンティティ・VO）
  /logical-designer     論理設計（レイヤー構造・インターフェース定義）
  /environment-designer 開発環境・インフラ構成設計

Level 3: テスト設計
  /unit-test-designer       ユニットテストケース設計
  /it-test-designer         結合テストケース設計
  /scenario-test-designer   E2Eシナリオテスト設計
  /test-coverage-checker    テストカバレッジ検証

Level 4: テストロジック設計
  /unit-test-logic-designer       Vitestテスト実装ロジック設計
  /it-test-logic-designer         結合テスト実装ロジック設計
  /scenario-test-logic-designer   Playwrightテスト実装ロジック設計

Level 5: 実装
  /implementation-readiness-checker  実装開始前の準備状況確認
  /story-implementor                 TDD実装（Red→Green→Refactor）

保守・品質
  /consistency-checker    設計文書間の整合性チェック
  /cascade-updater        変更の影響範囲を上位設計に反映
  /engineering-perspective  多角的エンジニアリングレビュー
```

> **ルール**: 上位レイヤーの設計文書が存在しない場合、下位のスキルは実行できません。

---

## CLIコマンド

```bash
# セットアップ
npx harness init --name <project>   # スキル展開 + harness.config.json生成
npx harness update-skills           # スキルを最新版に更新

# 品質チェック
npx harness lint                    # L1構文チェック（Biome AST）
npx harness validate --layer all    # L2〜L4バリデーター実行
npx harness ci-check                # CI用フルチェック
npx harness ci-check --quick        # クイックモード（高速）

# 状態確認
npx harness harness:status          # ハーネス全体の状態
npx harness harness:check-ready     # 実装開始可否判定
npx harness harness:check-phase --unit <unitId>  # Unitのフェーズ確認

# ADR管理
npx harness list-adrs               # ADR一覧
npx harness validate-adr --all      # 全ADRの検証
```

---

## 品質レイヤー

| レイヤー | タイミング | 検査内容 |
|---|---|---|
| **L1** | コミット前 | 構文・命名規約・依存方向（Biome AST） |
| **L2** | PR作成前 | フェーズゲート・アーキテクチャ・メタデータ |
| **L3** | マージ前 | 設計-実装整合性・テスト品質・セキュリティ |
| **L4** | スケジュール | N+1クエリ・バンドルサイズ・ドリフト検出 |

---

## ディレクトリ構造（導入後のプロジェクト）

```
your-project/
├── harness.config.json          # ハーネス設定
├── docs/
│   ├── folder_management_rules.md
│   ├── principles/
│   │   ├── architecture-philosophy.md
│   │   └── testing-rules.md
│   ├── product/                 # プロダクト設計文書（確定版）
│   │   ├── <product>_overview.md
│   │   └── units/               # Unit仕様書
│   └── inception/               # AIDLCで生成される設計文書
│       ├── _shared/
│       └── {unit-name}/
│           └── {US-XXX}/
├── src/                         # 実装コード
└── .claude/
    ├── CLAUDE.md
    └── skills/                  # npx harness init で自動展開（gitignore推奨）
```

### .gitignore 推奨設定

```
node_modules/
.claude/skills/   # harness init で再生成可能なため除外
dist/
reports/
```

---

## バージョン管理

本パッケージは **Semantic Versioning**（MAJOR.MINOR.PATCH）を採用しています。

| 変更の種類 | バージョン |
|---|---|
| バグ修正・小改善 | PATCH（例: v1.1.0 → v1.1.1） |
| スキル追加・新コマンド追加 | MINOR（例: v1.1.0 → v1.2.0） |
| 破壊的変更（設定スキーマ変更等） | MAJOR（例: v1.x.x → v2.0.0） |

### リリース手順（GSDLC_HARNESS側）

```bash
# 1. package.json のバージョンを更新
npm version patch   # or minor / major

# 2. コミット & タグ & プッシュ
git add package.json
git commit -m "chore: bump version to vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### アップデート手順（利用側プロジェクト）

```bash
# 1. package.json の参照タグを更新
# "gsdlc-harness": "github:junpei-9898/GSDLC_HARNESS#vX.Y.Z"

# 2. 再インストール
npm install

# 3. スキルを最新版に更新
npx harness update-skills
```

---

## harness.config.json の主要設定

```jsonc
{
  "project": {
    "name": "your-project",
    "preset": "standard"        // standard | strict | minimal
  },
  "paths": {
    "designDocs": "docs/product/construction",
    "inceptionDocs": "docs/inception"
  },
  "layers": {
    // L1〜L4 の有効/無効・ルール設定
  },
  "phaseDependencies": {
    "preset": "default",        // フェーズ順序の強制ルール
    "override": false
  }
}
```

詳細は `npx harness list-features` で確認できます。
