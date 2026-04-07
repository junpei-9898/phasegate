# Phasegate 開発者ガイド

phasegate 自体の開発・メンテナンスに関するドキュメントです。phasegate を **利用する** 場合は [README.ja.md](README.ja.md) を参照してください。

---

## 目次

- [開発環境セットアップ](#開発環境セットアップ)
- [内部アーキテクチャ](#内部アーキテクチャ)
- [CLIコマンド（開発者向け）](#cliコマンド開発者向け)
- [回帰テスト (K1-K15)](#回帰テスト-k1-k15)
- [ディレクトリ構造](#ディレクトリ構造)
- [バージョン管理・リリース手順](#バージョン管理リリース手順)
- [ロードマップ](#ロードマップ)

---

## 開発環境セットアップ

```bash
git clone https://github.com/junpei-9898/phasegate.git
cd phasegate
pnpm install
pnpm test
```

| 要件 | バージョン |
|---|---|
| Node.js | 18以上 |
| pnpm | 10.x |
| TypeScript | 5.x |

---

## 内部アーキテクチャ

phasegate は Clean Architecture + DDD で構成されています。各機能は独立した **Unit** に分離され、`scripts/harness/` 配下に配置されています。

依存方向: `domain → application → infrastructure / presentation`（逆方向禁止）

### Unit 一覧

| Unit | 責務 |
|---|---|
| `config-foundation` | phasegate.config.json 解析・スキーマ検証・プリセット |
| `harness-error` | HarnessError 定義・ADR 参照・修正コード例 |
| `traceability-model` | @unit/@layer/@story メタデータ管理 |
| `phase-dependency-model` | フェーズ依存関係・Phase Gate・storyReflection |
| `adr-foundation` | ADR 管理 |
| `biome-ast-engine` | Biome AST 解析エンジン（import グラフ・L1 ルール） |
| `validator-system` | L0-L4 バリデータシステム |
| `nyquist-validation` | 要件-テストトレーサビリティ |
| `harness-api` | phasegate:* コマンド CLI 層 |
| `quick-mode` | Quick Mode 判定・緩和実行 |
| `agent-integration` | Claude Code Hooks アダプタ |
| `skill-quality` | TDD サイクル・カバレッジ・Cascade Update |
| `ci-governance` | CI/CD テンプレート・反復エラー監視 |
| `regression-suite` | K1-K15 回帰テストスイート |
| `fuse-hooks-engine` | Hooks Engine (.harness-hooks.yml・完了ゲート) |
| `phase2-extensions` | freshness / pointer / e2e-template (v2) |

### メタデータ規約

全ソースファイル先頭に `@unit` / `@layer` コメントを記載:

```typescript
// @unit config-foundation
// @layer domain

export class ConfigSchema { ... }
```

`@layer` の有効値: `domain` / `application` / `infrastructure` / `presentation`

### HarnessError フォーマット

全バリデータは統一された `HarnessError` フォーマットでエラーを報告します。

```typescript
interface HarnessError {
  code: string;         // "L1-003", "L2-001" など
  severity: "error" | "warning";
  message: string;      // 人間可読な説明
  suggestion: string;   // 修正方法の提案
  adr_ref?: string;     // 関連ADR参照 ("ADR-003" など)
  fix_example?: string; // 修正コード例（AIエージェントの自己修正用）
}
```

---

## オプション: シェルスクリプトフック

`.claude/scripts/` 配下に以下のオプションフックを配置できます。phasegate のコア機能ではなく、開発環境カスタマイズ用です。

```jsonc
// .claude/settings.json に追記
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/deny-check.sh"
        }]
      }
      // ... 既存の Write|Edit フック
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/format-settings-hook.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/format-typescript-hook.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/analyze-errors-hook.sh"
          }
          // ... 既存の post-tool-use-hook.ts
        ]
      }
    ]
  }
}
```

| スクリプト | 動作 |
|---|---|
| `deny-check.sh` | 危険な git/bash コマンド（`git reset --hard`, `rm -rf` 等）をブロック |
| `format-settings-hook.sh` | `settings.json` 編集時に JSON を自動整形 |
| `format-typescript-hook.sh` | TypeScript ファイル編集時に自動フォーマット（Biome / ESLint+Prettier 切替可能） |
| `analyze-errors-hook.sh` | TypeScript ファイル編集時に tsc / lint エラーを検出しフィードバック |

### hook-config.json

`format-typescript-hook.sh` と `analyze-errors-hook.sh` は `.claude/scripts/hook-config.json` で対象ディレクトリとフォーマッタを設定します。

```json
{
  "targetDirs": ["scripts/harness"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

| フィールド | 説明 | デフォルト |
|---|---|---|
| `targetDirs` | フックが適用されるディレクトリのリスト（プロジェクトルートからの相対パス） | `[]`（空の場合スキップ） |
| `formatter` | `"biome"` または `"eslint-prettier"` | `"biome"` |
| `formatterArgs` | フォーマッタに渡す引数 | `["check", "--write"]` |

---

## CLIコマンド（開発者向け）

以下のコマンドは phasegate 自体の開発・品質保証に使用します。ユーザー向けコマンドは [README.ja.md](README.ja.md#cliコマンドリファレンス) を参照してください。

### 回帰テスト

| コマンド | 説明 |
|---|---|
| `regression:run-k-requirements` | K1-K15 非交渉要件の回帰テスト |
| `regression:run-gng-gate` | Go/No-Go Gate 3 条件の回帰テスト |
| `regression:run-agent-guard` | エージェント非依存性ガード |
| `regression:run-k14-k15` | K14/K15 (Phase Dependency / Plan 文書) 回帰テスト |
| `regression:configure-ci-gate` | CI ゲート設定 |
| `regression:analyze-migration` | v0 テスト移行分析 |
| `regression:migrate-v0-tests` | v0 テスト移行実行 |

### Hooks Engine

| コマンド | 説明 |
|---|---|
| `hooks:config validate` | .harness-hooks.yml の検証 |
| `hooks:gate-check --story <id>` | 完了ゲートチェック |

### Phase 2 拡張

| コマンド | 説明 | オプション |
|---|---|---|
| `p2:check-freshness` | 設計文書の鮮度チェック | `--pattern <glob>` `--dry-run` `--format text\|json` |
| `p2:validate-pointers` | ドキュメント内ファイルポインタ検証 | `--include-urls` `--format text\|json` |
| `p2:generate-e2e-template` | E2E テストテンプレート生成 | `--phase <phase>` `--output <path>` |

### スキル品質

| コマンド | 説明 | オプション |
|---|---|---|
| `skill:execute-tdd-cycle` | TDD サイクル実行 | `--unit` `--story` `--desc` `--phase RED\|GREEN\|REFACTOR` `--passed` |
| `skill:check-coverage` | テストカバレッジ検証 | `--story <storyId>` `--json` |
| `skill:collect-lessons` | エージェント Lesson 収集 | `--story <storyId>` `--sources <paths>` `--write-artifact` |
| `skill:apply-cascade-update` | 上位設計への影響反映 | `--story <storyId>` `--dry-run` |
| `skill:validate-structure` | スキル構造検証 | `--file <path>` `--json` |

### CI/CD（開発者向け）

| コマンド | 説明 | オプション |
|---|---|---|
| `ci:check-repetition` | 反復エラー検出 | `--code <errorCode>` `--reset` `--json` |

---

## 回帰テスト (K1-K15)

phasegate の非交渉要件が継続的に満たされているかを検証するセルフテストです。

```bash
# K1-K15 非交渉要件の回帰テスト（16件）
npx phasegate regression:run-k-requirements

# Go/No-Go Gate 品質側3条件（3件）
npx phasegate regression:run-gng-gate

# K14（Phase Dependency Model）/ K15（Plan文書必須）（2件）
npx phasegate regression:run-k14-k15

# エージェント非依存性ガード（3件）
npx phasegate regression:run-agent-guard
```

JSON 出力:

```bash
npx phasegate regression:run-k-requirements --format json
```

### 非交渉要件 (K1-K15) 概要

| # | 要件 |
|---|---|
| K1 | 5 層防御モデル（L0-L4） |
| K2 | Phase Gate（設計→実装の順序強制） |
| K3 | Biome AST 解析（import グラフ + 循環依存検出） |
| K3.5 | @unit/@layer/@US-XXX メタデータ |
| K4 | テスト品質ルール（AAA / actual / no-domain-mock 等） |
| K5 | DDD 設計スキル群 |
| K6 | 2-Phase Execution（AI 安全メカニズム） |
| K7 | Document Split（inception/product 分離） |
| K8 | Cascade Updater |
| K9 | Agent-Lesson System |
| K10 | Security/Performance 検出 |
| K11 | Drift Detection（双方向） |
| K12 | Consistency Checker |
| K13 | phasegate.config.json（品質設定 SSOT） |
| K14 | Phase Dependency Model（3 層フェーズ構造） |
| K15 | Plan 文書の必須生成 |

---

## ディレクトリ構造

### 内部構造

```
phasegate/
├── scripts/harness/
│   ├── main.ts                      # CLI エントリポイント
│   ├── harness-error/               # HarnessError 定義・ADR 参照
│   ├── config-foundation/           # phasegate.config.json 解析・スキーマ
│   ├── traceability-model/          # @unit/@layer/@story メタデータ管理
│   ├── phase-dependency-model/      # フェーズ依存関係・Phase Gate
│   ├── adr-foundation/              # ADR 管理
│   ├── biome-ast-engine/            # Biome AST 解析エンジン
│   ├── validator-system/            # L0-L4 バリデータシステム
│   ├── nyquist-validation/          # 要件-テストトレーサビリティ
│   ├── harness-api/                 # phasegate:* コマンド CLI 層
│   ├── quick-mode/                  # Quick Mode 判定・緩和実行
│   ├── agent-integration/           # Claude Code Hooks アダプタ
│   ├── skill-quality/               # TDD サイクル・カバレッジ・Cascade Update
│   ├── ci-governance/               # CI/CD テンプレート・反復エラー監視
│   ├── regression-suite/            # K1-K15 回帰テストスイート
│   ├── fuse-hooks-engine/           # Hooks Engine
│   └── phase2-extensions/           # freshness/pointer/e2e-template (v2)
├── skills/                          # 28 スキル（npx phasegate init で展開）
├── templates/
│   └── phasegate.config.json        # 設定テンプレート
└── docs/
    ├── principles/                  # アーキテクチャ哲学・テスト規約
    └── product/                     # phasegate 自身の設計文書
```

### テスト構造

```
scripts/harness/__tests__/
├── unit/                            # ユニットテスト（Unit 別）
│   ├── biome-ast-engine/
│   ├── config-foundation/
│   ├── harness-api/
│   ├── harness-error/
│   └── ...
├── integration/                     # 統合テスト
│   ├── biome-ast-engine/
│   ├── config-foundation/
│   └── ...
├── e2e/                             # E2E テスト
├── fixtures/                        # テストフィクスチャ
└── helpers/                         # テストヘルパー
```

---

## バージョン管理・リリース手順

Semantic Versioning (MAJOR.MINOR.PATCH) を採用しています。

| 変更種別 | バージョン |
|---|---|
| バグ修正・小改善 | PATCH (例: v1.1.0 → v1.1.1) |
| スキル追加・新コマンド追加 | MINOR (例: v1.1.0 → v1.2.0) |
| 設定スキーマ変更など破壊的変更 | MAJOR (例: v1.x.x → v2.0.0) |

### リリース手順

```bash
# 1. package.json の version を更新
# 2. コミット・タグ
git add package.json
git commit -m "fix: vX.Y.Z — 変更内容"
git tag vX.Y.Z
git push origin main --tags

# 3. npm publish
npm publish
```

---

## ロードマップ

| バージョン | 内容 |
|---|---|
| **v1.6.0 (v1 MVH)** | L1-L4・28 スキル・Claude Code Hooks・Nyquist Validation・K1-K15 回帰テスト完備 |
| **v2.0.0** | Hooks Engine（.harness-hooks.yml 設定・完了ゲート）・Phase 2 拡張（doc-freshness・pointer-validator・Playwright E2E テストテンプレート） |

---

*See also: [README.ja.md](README.ja.md) (user guide) / [README.md](README.md) (English)*
