# CLAUDE.md

Phasegate — AI非依存の品質防御ツールキット。

## プロジェクト概要

設計意図とコードの構造的整合性を機械的に保証する5層防御モデル（L0-L4）と28スキルを提供するCLIツール。

## アーキテクチャ

- **Clean Architecture** — `scripts/harness/` 配下が `domain` / `application` / `infrastructure` / `presentation` のレイヤー構造
- 依存方向: `domain → application → infrastructure/presentation`（逆方向禁止）
- エントリポイント: `bin/harness` → `scripts/harness/main.ts`

## ディレクトリ構造

```
bin/harness              # CLI エントリポイント
scripts/harness/         # メインソースコード（CA構造）
skills/                  # 28スキル定義
templates/               # テンプレートファイル
docs/
├── ADR/                 # Architecture Decision Records
├── principles/          # 開発原則・テスト規約
├── inception/           # 設計文書（Unit別）
└── product/             # 確定済み設計文書
```

## 開発ルール

### コーディング規約
- ファイル名: `kebab-case`
- クラス名: `PascalCase`
- メタデータ: 全ソースファイル先頭に `// @unit <unit名>` `// @layer <layer名>` を記載
- `@layer` の有効値: `domain` / `application` / `infrastructure` / `presentation`

### テスト規約
- テストフレームワーク: Vitest
- AAAパターン（Arrange / Act / Assert）必須
- テストケース名は日本語
- ファイル名は kebab-case
- ドメイン層のモックは禁止

### 禁止事項
- `docs/principles/` の直接編集（immutable）
- レイヤー依存方向の逆転
- 設計文書なしでの実装開始（Phase Gate強制）

### フェーズゲート必須ルール（重要）

`scripts/harness/` 配下のソースコード（`__tests__/` を除く）を新規作成・構造的に変更する場合、**必ず以下の手順を踏むこと**:

1. **新機能追加・API契約変更・新ドメインモデル追加** → `story-implementor` スキルを使用
   - `implementation-readiness-checker` が前提条件として必須
   - Phase 1（計画）→ 承認 → Phase 2（TDD実装）の2フェーズ実行
   - `docs/product/construction/{unit}/logical_design.md` と `domain_model.md` が存在しない Unit への書き込みは **pre-tool-use hook でブロックされる**
2. **バグ修正・テスト追加・設定変更・ドキュメント修正** → `quick-implementor` スキルを使用
   - Phase Gate は緩和されるが、L1/L2(metadata, test-quality) は維持

**以下の行為は禁止**:
- スキルを使わずに `scripts/harness/` 配下のソースコードを直接 Edit/Write すること
- `quick-implementor` を新機能追加に使うこと（スコープ違反）
- フェーズゲートのブロックをユーザーに解除させて回避すること

## ハーネスコマンド

```bash
npx harness validate --layer L0     # L0 FUSEフック検証
npx harness lint                    # L1 Biome ASTチェック
npx harness validate --layer L2     # L2 Pre-commitチェック
npx harness validate --layer L3     # L3 CIチェック
npm run harness:status              # ハーネス状態表示
npm run harness:check-phase         # フェーズゲート確認
npm run test                        # テスト実行
```

## 必読ドキュメント

- `docs/folder_management_rules.md` — ドキュメント配置ルール
- `docs/principles/architecture-philosophy.md` — アーキテクチャ哲学
- `docs/principles/testing-rules.md` — テスト規約
- `phasegate.config.json` — 品質設定のSingle Source of Truth

### バージョニングルール（必須）

変更をコミットする際は、**必ず `package.json` の minor バージョンを上げること**。

- `version` フィールド: `"0.X.0"` → `"0.(X+1).0"`
- `devDependencies.phasegate` の semver 参照も同期更新
- タグ `vX.Y.Z` を付与して push

```bash
# 例: v0.5.0 → v0.6.0
# 1. package.json の version を更新
# 2. devDependencies の phasegate semver を更新
# 3. git tag v0.6.0
# 4. git push origin main --tags
```
