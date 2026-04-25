# Phasegate

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**AI が書いたコードに「設計してから書け」を物理的に強制するツールキット。**
Claude Code / Codex / Cursor / Copilot — どの AI agent でも同じ防御が効きます。

[English README](README.md) ・ [開発者ガイド](DEVELOPMENT.ja.md)

---

## 30 秒でわかる Phasegate

1. **AI agent が設計文書なしで実装ファイルを書こうとすると、Write/Edit/Bash がブロックされる**（PreToolUse hook）
2. **コミット前に L1〜L3 のバリデーションが自動で走り**、レイヤー違反・テスト品質違反・依存方向違反を弾く
3. **ブロック時のエラーは AI が読んで自己修正できる形式**（理由・必要な設計文書・次に打つべきスキル名が出る）

`npx phasegate init` を 1 回打てば、上記が全部入ります。

---

## なぜ Phasegate か

AI agent は速いが、設計を飛ばして実装に走ります。レイヤー境界を平気で越え、`any` 型で型システムを骨抜きにし、テストはあるけど実装の写経になっている — そんなコードを高速に量産します。レビューで全部捕まえるのは現実的ではありません。

Phasegate はこれを **「人がレビューで防ぐ」のではなく「ツールがファイルシステム/git/CI レベルで防ぐ」** で解決します。設計文書がなければそもそも書けない。レイヤー違反があれば commit が通らない。AI agent 自身が「次にどの設計スキルを呼べばいいか」を読んで自走します。

### こんなプロジェクトで効きます

| 向いている | 向いていない |
|---|---|
| AI agent に複数機能を任せる中〜大規模開発 | 数百行の使い捨てスクリプト |
| Clean Architecture / DDD / Hexagonal を採用 | 構造を持たないアドホック実装 |
| TDD・テスト規約を守らせたい | テストを書かない方針 |
| 設計とコードの乖離を継続的に検出したい | コードのみが Source of Truth |

---

## 動いている様子

AI agent が設計なしに `src/order/order-service.ts` を書こうとすると、PreToolUse hook が止めます。

```
フェーズゲート違反: src/order/order-service.ts
対象スコープ: Level 3 (実装), Unit: order
ブロック理由:
  - docs/product/construction/order/domain_model.md が存在しません
  - docs/product/construction/order/logical_design.md が存在しません
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  実行例: /story-implementor --unit order
```

Claude Code / Codex はこのメッセージを読んで `/story-implementor` を起動し、ドメイン設計→論理設計→TDD 実装の順で進みます。人間が「設計やってからね」と言わなくても自走します。

---

## クイックスタート

### 前提

Node.js >= 18, npm >= 9, TypeScript 5.x

### 3 ステップ

```bash
# 1. インストール
npm install --save-dev phasegate

# 2. プロジェクトを初期化
npx phasegate init --name my-project --with-husky

# 3. AI agent を起動して /product-architect から始める
claude
> /product-architect
```

`init` が生成するもの:

- `phasegate.config.json` — 品質設定の Single Source of Truth
- `skills/` — 28 の AIDLC スキル一式
- `.claude/skills/` ・ `.codex/skills/` — agent 向けの skill symlink
- `.claude/settings.json` — PreToolUse / PostToolUse / Stop hook
- `docs/principles/` ・ `docs/folder_management_rules.md` — 設計原則 docs
- `--with-husky` を付けると `.husky/pre-commit` ・ `.husky/commit-msg` も配置

### Codex CLI を使う場合

```bash
npx phasegate init --name my-project --agent codex --with-husky
codex features enable codex_hooks   # Codex 本体の feature flag を手動で有効化
```

両方使う場合は `--agent both`。詳細は [Codex Integration Guide](docs/guide/codex-integration.md) を参照。

### アップデート

```bash
npm update phasegate
npx phasegate update-skills   # スキルを最新版に再デプロイ
```

---

## 主な機能

| 機能 | できること |
|---|---|
| **フェーズゲート** | 設計文書がないと実装ファイルへの Write/Edit/Bash をブロック。AIDLC 準拠 / カスタム gate の両方をサポート |
| **5 層バリデーション (L0-L4)** | エディタ保存 → pre-commit → CI → 週次まで段階的に品質チェック |
| **28 AIDLC スキル** | 要求定義 → ドメイン設計 → テスト設計 → TDD 実装をスキルとして提供 |
| **Quick Mode** | バグ修正・docs・テスト追加など軽微変更ではゲートを緩和して高速化 |
| **Claude Code / Codex Hooks** | Write/Edit/Bash 時に自動でゲートチェック・lint を実行 |
| **HarnessError 形式** | 全エラーに ADR 参照 + 修正例が含まれ、AI が自己修正できる |
| **Baseline (retrofit)** | 既存リポジトリ導入時、`baseline` snapshot に登録した既存ファイルは構造的に編集されるまで gate 対象外 |

---

## 5 層防御モデル

```
+------------------------------------------------------------------+
| L0  AI agent runtime + git hooks                                 |
|     PreToolUse / PostToolUse / Stop / SessionStart /             |
|     UserPromptSubmit + .husky/pre-commit + .husky/commit-msg     |
+------------------------------------------------------------------+
| L1  エディタ時 / `phasegate lint`                                |
|     @unit / @layer メタデータ, レイヤー違反, AI アンチパターン   |
+------------------------------------------------------------------+
| L2  pre-commit                                                   |
|     phase-gate, story-reflection, テスト品質 (AAA/日本語名)       |
+------------------------------------------------------------------+
| L3  CI/CD                                                        |
|     security, performance, coverage 90%/95%, 要件カバレッジ        |
+------------------------------------------------------------------+
| L4  週次 (default off)                                           |
|     設計-コード乖離, 文書整合性, デッドコード, 文書鮮度          |
+------------------------------------------------------------------+
```

| Layer | 実行タイミング | コマンド |
|---|---|---|
| **L0** | AI agent / git hook | runtime 自動（`.claude/settings.json` 等） |
| **L1** | 保存時 | `npx phasegate lint` |
| **L2** | コミット前 | `npx phasegate validate --layer L2` |
| **L3** | CI/CD | `npx phasegate validate --layer L3` |
| **L4** | 週次 cron | `npx phasegate validate --layer L4` |

エラーは `HarnessError` 形式（理由 / ADR 参照 / 修正例）で返されるため、AI agent が自己修正できます。

> `--layer L0` の `L0-001` / `L0-002` は legacy validator で `enabled: false`。実体の L0 は agent-integration の hook と Husky です。

詳細: [5-Layer Defense Model](docs/guide/layer-model.md)

---

## 28 AIDLC スキル

AIDLC (AI-Driven Development Life Cycle) は **要求定義 → 設計 → テスト設計 → TDD 実装** の順序を強制するプロセスです。各スキルは前のレベルの成果物を入力にします。

**最初の一歩**: Claude Code / Codex 内で `/product-architect` を実行。

### 5 グループ（28 スキル）

| グループ | スキル |
|---|---|
| **Foundation (4)** | `/product-architect` `/story-writer` `/story-mapper` `/unit-designer` |
| **Design (5)** | `/domain-designer` `/logical-designer` `/mock-designer` `/uiux-designer` `/environment-designer` |
| **Test Engineering (7)** | `/unit-test-designer` `/it-test-designer` `/scenario-test-designer` `/unit-test-logic-designer` `/it-test-logic-designer` `/scenario-test-logic-designer` `/test-coverage-checker` |
| **Implementation (4)** | `/story-implementor` `/quick-implementor` `/implementation-planner` `/implementation-readiness-checker` |
| **Verification (8)** | `/consistency-checker` `/cascade-updater` `/codex-delegator` `/codebase-mapper` `/doc-freshness-checker` `/pointer-validator` `/engineering-perspective` `/skill-creator` |

各スキルの詳細・成果物・前提条件: [Skills Overview](docs/guide/skills-overview.md)

---

## メタデータ規約

ソースファイル先頭に `@unit` / `@layer` を、テストには `@story` を記載します。L1 はこれを使ってレイヤー違反検出と drift-detection を行います。

```typescript
// @unit config-foundation
// @layer domain
// @story US-001          ← テストファイルのみ

export class ConfigSchema { ... }
```

| タグ | 値 |
|---|---|
| `@unit` | `/unit-designer` が定義した Unit 名（例: `config-foundation`） |
| `@layer` | `architecture.preset` で定義した層名（例: `domain` / `application` / `infrastructure` / `presentation`） |
| `@story` | 検証する US の ID（例: `US-001`） |

---

## 設定の要点

`phasegate.config.json` が品質設定の Single Source of Truth です。**ほぼ全項目にデフォルトがあるため、まずは init が生成したものをそのまま使えば動きます**。

```jsonc
{
  "project":   { "name": "my-project", "preset": "standard" },
  "architecture": { "preset": "clean" },
  "layers": {
    "L0": { "enabled": false }, "L1": { "enabled": true },
    "L2": { "enabled": true  }, "L3": { "enabled": true  },
    "L4": { "enabled": false }
  },
  "phaseDependencies": { "preset": "standard", "storyReflection": { "enabled": true } },
  "quickMode":      { "allowedCategories": ["bugfix", "docs", "test", "config"] },
  "protectedFiles": { "exclude": ["package.json"] },
  "baseline":       { "enabled": true, "path": ".phasegate/baseline.json" }
}
```

### 3 系統の preset（呼称分離）

phasegate には独立した 3 系統の preset があります。役割が違うので呼び分けます。

| 呼称 | 設定キー | 値 | 役割 |
|---|---|---|---|
| **防御プリセット** | `project.preset` | `minimal` / `standard` / `strict` | 有効レイヤーとカバレッジ閾値を決める |
| **アーキプリセット** | `architecture.preset` | `clean` / `strict-ddd` / `onion` / `hexagonal` / `layered` / `flat` / `custom` | L1 が検査する層構造と依存方向 |
| **フェーズプリセット** | `phaseDependencies.preset` | `full` / `standard` / `minimal` / `custom` | フェーズゲートの厳密度 |

`npx phasegate init --preset <id>` の `--preset` は **フェーズプリセット**（`full / standard / minimal / custom`）を設定します。`project.preset` の `strict` は別概念です。

選定ガイド: [Preset Selection Guide](docs/guide/preset-selection.md)

### 主要キー

| キー | 効果 |
|---|---|
| `quickMode.fullModeRequiredWhen` | Quick Mode → Full Mode への強制エスカレート条件（複数カテゴリ混在 / 新規ドメインファイル / API 契約変更）。安全側の default は全 `true` |
| `protectedFiles.exclude` | デフォルト保護対象（`package.json`, `tsconfig.json`, `biome.json` 等）から除外したいファイル |
| `baseline.enabled` | 既存リポジトリ導入時の retrofit grandfather。default `true`。`npx phasegate baseline` で snapshot 生成 |
| `phaseDependencies.storyReflection` | inception 設計が product docs に反映されるまで `src/{unit}/` への書き込みをブロック |

詳細: [Configuration Guide](docs/guide/configuration.md)

---

## CLI 主要コマンド

```bash
npx phasegate <command> [options]
```

| コマンド | 説明 |
|---|---|
| `init --name <name>` | 初期化（skills/config/hooks 配置）。`--agent claude\|codex\|both`、`--with-husky`、`--preset <full\|standard\|minimal\|custom>` |
| `update-skills` | スキルを最新版に再デプロイ |
| `lint` | L1 Biome AST チェック |
| `validate --layer <L1\|L2\|L3\|L4\|all>` | 指定レイヤーのバリデータ実行（`--format human\|agent\|ci`） |
| `ci-check` | CI フルチェック（L2-L4）。`--quick` で Quick Mode |
| `check-change-category --paths <csv>` | 変更ファイルを Quick Mode カテゴリに分類、Full Mode 強制が必要かを返す |
| `baseline` | retrofit grandfather snapshot 生成（`--dry-run`, `--force`, `--paths <glob>`, `--json`） |
| `scaffold-design --unit <id> --phase <logical\|domain\|uiux\|unit-test\|it-test>` | 最小構成の設計文書を `templates/` から生成 |
| `phasegate:status` | 全体の健全性サマリ |
| `phasegate:check-phase --unit <id>` | 指定 Unit の現在フェーズ |
| `phasegate:detect-drift` | 設計-コード乖離レポート |
| `migrate work-items --dry-run` / `--apply` | 旧 `ISSUE-XXX` / `H{NN}-{NN}` を `WI-XXX` 統一レイアウトへ移行 |
| `migrate --schema v3` | `phasegate.config.json` を v3 schema へ昇格（`architecture` キー追加） |
| `ci:generate-template --type <aidlc-gate\|pre-commit\|consistency-check>` | CI/CD テンプレート生成（`--render` でファイル出力） |
| `list-errors --layer <L0-L4>` | エラー定義一覧 |
| `hook <pre-tool-use\|post-tool-use\|stop>` | agent hook を起動（stdin から JSON） |
| `pre-commit` | L2 pre-commit バリデータをステージファイルに適用 |

完全な CLI Reference: [CLI Reference](docs/guide/cli-reference.md)

---

## Hooks 統合

### Claude Code

`init` が `.claude/settings.json` に以下を配置します。

| Hook | タイミング | 動作 |
|---|---|---|
| **PreToolUse** | Write/Edit/Bash の実行前 | フェーズゲート違反 / 保護ファイル / Bash 経由迂回をブロック。Quick→Full 強制条件のチェックも実行 |
| **PostToolUse** | Write/Edit の実行後 | Biome AST ルールを自動実行、違反を即時フィードバック |
| **Stop** | セッション終了前 | L2-L4 全チェックを実行、グリーンでないと終了を保留 |

### Codex CLI

`init --agent codex` で `.codex/hooks.json` を配置。Codex のネイティブ `apply_patch` ツールは hook を発火しないため（[openai/codex#16732](https://github.com/openai/codex/issues/16732)）、ネイティブ経路は **pre-commit (L2)** で commit 時にブロックされます。

| 編集経路 | 事前 hard block | commit 時 block |
|---|---|---|
| Bash 書き込み（`sed -i`, `tee`, heredoc, `cat >`） | ✅ PreToolUse(Bash) | ✅ pre-commit |
| Bash 経由 `apply_patch <<'PATCH'` | ✅ PreToolUse(Bash) | ✅ pre-commit |
| Codex ネイティブ `apply_patch` | ❌ Codex 側の制約で hook 非発火 | ✅ pre-commit |

**推奨運用**: こまめに commit して pre-commit でネイティブ `apply_patch` 違反を早期に surface する。

詳細: [Hooks Integration](docs/guide/hooks-integration.md) ・ [Codex Integration](docs/guide/codex-integration.md)

---

## 導入後のプロジェクト構造

```
your-project/
├── phasegate.config.json
├── docs/
│   ├── folder_management_rules.md
│   ├── principles/                # アーキテクチャ哲学・テスト規約
│   ├── product/construction/{unit}/   # 確定版設計（domain_model.md / logical_design.md）
│   ├── inception/{unit}/{US-XXX}/     # AIDLC が生成する設計計画
│   └── ADR/
├── src/                            # 実装コード（@unit/@layer 必須）
├── .claude/{settings.json, skills/}
├── .codex/{hooks.json, skills/}
└── skills/                         # init で再生成可能
```

推奨 `.gitignore`:

```
node_modules/
skills/            # init で再生成可能
.claude/skills/    # symlink
.codex/skills/     # symlink
dist/
reports/
```

---

## ロードマップ

ドキュメントで言及があるが現状 partial 実装または user 配線に依存しているもの。各 Work Item は `docs/inception/_cross/WI-XXX/description.md` に起票済み。

| Work Item | 内容 |
|---|---|
| **[WI-031](docs/inception/_cross/WI-031/description.md)** | CI template の二系統統一 + `phasegate init --with-ci` |
| **[WI-032](docs/inception/_cross/WI-032/description.md)** | AGENTS.md / CLAUDE.md auto-refresh パイプライン |
| **[WI-033](docs/inception/_cross/WI-033/description.md)** | `doc-freshness` / `pointer-validation` を L4 validator に昇格 |
| **[WI-034](docs/inception/_cross/WI-034/description.md)** | L0 legacy validator (`L0-001` / `L0-002`) の撤去 |

L3 Nyquist Validation の `requirement-test-matrix.json` 自動生成パイプラインも未完成（手動セットアップで利用可）。

---

## ドキュメント

- [Installation](docs/guide/installation.md) — 詳細インストール手順
- [Configuration](docs/guide/configuration.md) — `phasegate.config.json` 完全リファレンス
- [CLI Reference](docs/guide/cli-reference.md) — 全 CLI コマンド・オプション
- [Skills Overview](docs/guide/skills-overview.md) — 28 スキルの実行順序と成果物
- [5-Layer Defense Model](docs/guide/layer-model.md) — L0-L4 詳細・HarnessError 形式
- [Hooks Integration](docs/guide/hooks-integration.md) — Claude Code Hooks 設定
- [Codex Integration](docs/guide/codex-integration.md) — Codex CLI セットアップ・カバレッジ
- [Quick Mode vs Full Mode](docs/guide/quick-vs-full-mode.md) — `/story-implementor` vs `/quick-implementor`
- [Retrofit Adoption Guide](docs/guide/retrofit-adoption.md) — 既存リポジトリへの段階的導入
- [Preset Selection Guide](docs/guide/preset-selection.md) — 3 系統の preset 選定

phasegate 自体の開発: [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md)

---

## ライセンス

[MIT License](LICENSE)

---

*Last updated: 2026-04-25 — v0.110.0*
