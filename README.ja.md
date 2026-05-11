![Phasegate header](assets/phasegate-header.png)

# Phasegate

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**AI agent に「設計してから書け」を hooks / git / CI で強制するツールキット。**
Claude Code / Codex / Cursor / Copilot — どの AI agent でも設計意図・レイヤー境界・テスト規約を守らせます。

[English README](README.md) ・ [開発者ガイド](DEVELOPMENT.ja.md)

---

## 30 秒でわかる Phasegate

1. **AI agent が設計文書なしで実装ファイルを書こうとすると、Write/Edit/Bash または git hook で止まる**
2. **コミット前に L1〜L3 のバリデーションが自動で走り**、レイヤー違反・テスト品質違反・依存方向違反を弾く
3. **ブロック時のエラーは AI が読んで自己修正できる形式**（理由・必要な設計文書・次に打つべきスキル名が出る）

`npx phasegate init` を 1 回打てば、上記が全部入ります。

---

## なぜ Phasegate か

AI agent は速いが、設計を飛ばして実装に走ります。レイヤー境界を平気で越え、`any` 型で型システムを骨抜きにし、テストはあるけど実装の写経になっている — そんなコードを高速に量産します。レビューで全部捕まえるのは現実的ではありません。

Phasegate はこれを **「人がレビューで防ぐ」のではなく「ツールが hooks / git / CI レベルで防ぐ」** で解決します。設計文書がなければ書き込みまたは commit が止まる。レイヤー違反があれば CI が通らない。AI agent 自身が「次にどの設計スキルを呼べばいいか」を読んで自走します。

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

Claude Code / Codex はこのメッセージを読んで `/story-implementor` を起動し、ドメイン設計→論理設計→TDD 実装の順で進みます。単に失敗させるのではなく、AI agent が復帰できる形で「次に何を作るべきか」を返します。

---

## クイックスタート

### 前提

Node.js >= 18, npm >= 9, TypeScript 5.x

### 3 ステップ

```bash
# 1. インストール
npm install --save-dev phasegate

# 2. 新規プロジェクトを初期化
npx phasegate init --name my-project --with-husky --with-ci

# 3. AI agent を起動して /product-architect から始める
claude
> /product-architect
```

`init` が生成するもの:

- `phasegate.config.json` — 品質設定の Single Source of Truth
- `skills/` — 28 の AIDLC スキル一式
- `.claude/skills/` ・ `.codex/skills/` — agent 向けの skill symlink
- `.claude/settings.json` — PreToolUse / PostToolUse / Stop hook
- `.codex/hooks.json` — Codex CLI hooks 設定（`--agent codex|both` 時）
- `docs/principles/*.md` — アーキテクチャ哲学・テスト規約（immutable）
- `docs/folder_management_rules.md` — ドキュメント配置ルール（**正本**）
- `--with-husky` を付けると `.husky/pre-commit` ・ `.husky/commit-msg` ・ `.husky/pre-push` も配置
- `--with-ci` を付けると `.github/workflows/aidlc-gate.yml` ・ `.github/workflows/consistency-check.yml` ・ `.github/workflows/agent-context-refresh.yml` も配置

**`init` が生成しないもの**（後で skill が作る）:

- `docs/inception/` 配下の WI directory — `/product-architect` 以降のスキル実行で生成
- `docs/product/` 配下の確定設計文書 — `/domain-designer` `/logical-designer` 等が生成
- `docs/ADR/` — `/skill-creator` や手動で必要に応じて作成

「設計してから書け」を強制する仕組みなので、設計文書はユーザーがスキル経由で作るのが既定動作です。

既存プロジェクトに導入する場合は、構造化 install で差分を確認してから適用します。

```bash
npx phasegate install --dry-run
npx phasegate install --apply
npx phasegate doctor
```

`install` は既存の Claude / Codex hooks や Husky script を捨てずに PhaseGate の設定を merge します。書き込み前に変更予定を表示し、package scripts と `phasegate` devDependency、agent skill symlink、未作成の CI workflow、`.phasegate/manifest.json` を整えます。強制的な managed 更新が必要な場合は `npx phasegate install --apply --force` を使います。この場合、置き換え対象は `.phasegate/backups/` に退避されます。

後で PhaseGate を外す場合は、manifest ベースの uninstall を使います。

```bash
npx phasegate uninstall --dry-run
npx phasegate uninstall --apply
```

`uninstall` は manifest を読んで、PhaseGate が作成したファイルを削除し、merge した Claude / Codex / Husky / `package.json` から PhaseGate 管理部分だけを取り除きます。ユーザーの既存設定は保持し、manifest は `.phasegate/` 配下に履歴として archive します。

### Codex CLI を使う場合

```bash
npx phasegate init --name my-project --agent codex --with-husky
codex features enable codex_hooks   # Codex 本体の feature flag を手動で有効化
```

両方使う場合は `--agent both`。Codex のネイティブ `apply_patch` は現時点で事前 hook を発火しないため、pre-commit (L2) で commit 時にブロックします。Bash 経由の書き込みは実行前に止まります。詳細は [Codex Integration Guide](docs/guide/codex-integration.md) を参照。

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
| **カスタム gate** | AIDLC 以外のプロジェクトでも schema-first など独自の前提条件を設定できる |

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
|     phase-gate, story-reflection, テスト品質 (semantic AAA)       |
+------------------------------------------------------------------+
| L3  CI/CD                                                        |
|     security, performance, coverage 90%/95%, 要件カバレッジ        |
+------------------------------------------------------------------+
| L4  週次 (default off)                                           |
|     設計-コード乖離, 文書整合性, デッドコード,                  |
|     doc-freshness, pointer-validation                            |
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

ソースファイル先頭に `@unit` / `@layer` を、テストには `@story` または `@work-item-id` を記載します。L1 / L2 はこれを使ってレイヤー違反検出・drift-detection・WI トレーサビリティを行います。

```typescript
// @unit config-foundation
// @layer domain
// @work-item-id WI-042   ← 任意（traceability に貢献）
// @story US-001          ← テストファイルのみ（legacy 互換）

export class ConfigSchema { ... }
```

| タグ | 値 | 必須性 |
|---|---|---|
| `@unit` | `/unit-designer` が定義した Unit 名（例: `config-foundation`） | **必須**（L1-001 が検証） |
| `@layer` | `architecture.preset` で定義した層名（例: `domain` / `application` / `infrastructure` / `presentation`） | **必須**（L1-002 が検証） |
| `@work-item-id` | このファイル変更を駆動した WI（例: `WI-042`） | 任意 |
| `@story` | 検証する US / WI の ID（例: `US-001`, `H02-04`） | テストでは推奨（legacy 互換） |

### product 文書での反映宣言

product 文書（`docs/product/construction/{unit}/*.md`）の章ごとに、反映元の WI を `@work-item-id` で記載します:

```markdown
## ポート定義

<!-- @work-item-id WI-042 -->
### OrderRepository Port
- findById(id: OrderId): Promise<Order>

<!-- @work-item-id WI-042, WI-051 -->
### PaymentGateway Port
- charge(amount: Money): Promise<Receipt>
```

L2-STORY-REFLECTION バリデータがこのアノテーションを検出し、inception 設計が product に反映されているかを判定します。

> **legacy 互換**: 既存 product 文書の `@story-id US-XXX` / `@story-id H##-##` / `@issue-id ISSUE-XXX` は、WI frontmatter の `legacy_id` 経由で読み替えられます。一括置換は **しません**。新規記述は `@work-item-id WI-XXX` を使ってください。

---

## 設定の要点

`phasegate.config.json` が品質設定の Single Source of Truth です。**ほぼ全項目にデフォルトがあるため、まずは init が生成したものをそのまま使えば動きます**。

```jsonc
{
  "project":   { "name": "my-project", "preset": "standard" },
  "architecture": { "preset": "clean" },
  "layers": {
    "L1": { "enabled": true },
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
| `init --name <name>` | 初期化（skills/config/hooks 配置）。`--agent claude\|codex\|both`、`--with-husky`、`--with-ci`、`--preset <full\|standard\|minimal\|custom>` |
| `update-skills` | スキルを最新版に再デプロイ |
| `lint` | L1 Biome AST チェック |
| `validate --layer <L1\|L2\|L3\|L4\|all>` | 指定レイヤーのバリデータ実行（`--format human\|agent\|ci`） |
| `ci-check` | CI フルチェック（L2-L4）。`--quick` で Quick Mode |
| `check-change-category --paths <csv>` | 変更ファイルを Quick Mode カテゴリに分類、Full Mode 強制が必要かを返す |
| `baseline` | retrofit grandfather snapshot 生成（`--dry-run`, `--force`, `--paths <glob>`, `--json`） |
| `scaffold-design --unit <id> --phase <logical\|domain\|uiux\|unit-test\|it-test>` | 最小構成の設計文書を `templates/` から生成 |
| `phasegate:status` | 全体の健全性サマリ |
| `work-items:status --dry-run` / `--apply` | 成果物から WI status を導出し、必要に応じて `description.md` frontmatter を更新。`--apply` は既定で downgrade を拒否し、必要時のみ `--allow-downgrade` を指定 |
| `phasegate:check-phase --unit <id>` | 指定 Unit の現在フェーズ |
| `phasegate:detect-drift` | 設計-コード乖離レポート |
| `migrate work-items --dry-run` / `--apply` | 既存リポジトリの旧 `ISSUE-XXX` / `H{NN}-{NN}` directory を WI 統一レイアウト（`_cross/{WI-XXX}/` / `{unit}/{WI-XXX}/`）へ移行。frontmatter（`type` / `severity` / `legacy_id` / `affects`）を自動注入。冪等。`--json` で CI/スクリプト連携可。詳細: [Work Item Migration](docs/guide/cli-reference.md#work-item-migration) |
| `migrate --schema v3` | `phasegate.config.json` を v3 schema へ昇格（`architecture` キー追加） |
| `ci:generate-template --type <aidlc-gate\|pre-commit\|consistency-check\|agent-context-refresh>` | CI/CD テンプレート生成（`--render` で bundled template を stdout 出力） |
| `ci:auto-refresh-agent-context --dry-run` / `--apply` | AGENTS.md pointer と CLAUDE.md 標準セクションを更新 |
| `refresh-claude-md --dry-run` / `--apply` | user section を保持して CLAUDE.md だけを更新 |
| `p2:check-agent-context` | AGENTS.md / CLAUDE.md の鮮度を検査 |
| `list-errors --layer <L0-L4>` | エラー定義一覧 |
| `hook <pre-tool-use\|post-tool-use\|stop>` | agent hook を起動（stdin から JSON） |
| `pre-commit` | L2 pre-commit バリデータをステージファイルに適用 |
| `bypass:audit --base <ref> [--head <ref>]` | push/CI range に pre-commit validation を再適用し、gate failure に structured bypass evidence を要求 |

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

## ドキュメント・ライフサイクル

Phasegate は **「inception で設計を起こし → product に確定させ → src に実装する」** という単方向のデータフローを物理的に強制します。各段階で生成される文書と PhaseGate の振る舞いが対応しています。

### 三階層モデル

```
docs/inception/{unit}/{WI-XXX}/   ← 一時的な計画・設計（WI ごと、流動）
        ↓ 設計成果物の反映（@work-item-id 付きで累積更新）
docs/product/construction/{unit}/  ← 確定設計（Unit ごとの正本、永続）
        ↕ フェーズゲート
scripts/harness/{unit}/(domain|application|infrastructure|presentation)/*.ts
```

### Work Item (WI) の置き場

WI は規模・影響範囲に応じて 3 通りに振り分けます。

| 配置先 | 用途 |
|---|---|
| `docs/inception/_shared/` | 非 WI の横断計画・戦略・調査メモ |
| `docs/inception/_cross/{WI-XXX}/` | 複数 Unit に影響する cross-cutting WI |
| `docs/inception/{unit}/{WI-XXX}/` | 単一 Unit が所有する WI |

> **廃止済み**（v0.104.0 で物理削除）: `docs/inception/issues/`, `docs/inception/{unit}/issues/`, `docs/inception/{unit}/{US-XXX}/`。既存資産は `npx phasegate migrate work-items --apply` で `WI-XXX` へ移行済み。`legacy_id` で旧 ID の grep 互換は維持。

### WI frontmatter（必須）

各 WI の `description.md` 先頭に:

```yaml
---
id: WI-042
type: story | issue | fix | refactor | chore   # 後述
severity: trivial | normal | high
status: drafted | reflected | implemented | tested   # PhaseGate が自動更新
affects: [unit-a, unit-b]                            # cross-unit のみ列挙
legacy_id: ISSUE-XXX | US-XXX | H{NN}-{NN}          # 任意
---
```

L2 metadata validator が frontmatter の妥当性を検証します。

### type による要求成果物の段階化

| `type` | inception 必須 | product 反映 | 用途 |
|---|---|---|---|
| `story` | description + logical_design + domain_model + test 設計 | 全カテゴリ累積 | 新機能 |
| `issue` | description + logical_design + domain_model + 関係 test 設計 | 関係カテゴリ累積 | バグ・仕様不整合 |
| `refactor` | description + logical_design | logical_design 更新 | リファクタ |
| `fix` | description + PR link | 関係カテゴリに `@work-item-id` 追記 | typo・依存更新等 |
| `chore` | description.md 1 行 + PR link | 不要 | 雑用 |

`fix` / `chore` は軽量パスとして提供。formal な story で起票するには重すぎる修正もここで証跡が残せます。

### State Machine

```
DRAFTED (inception 揃う)
  ↓ Phase 0/2 reflection
REFLECTED (product に @work-item-id 反映済み)
  ↓ Phase 3 implementation
IMPLEMENTED (src 実装あり / lint・type・test green)
  ↓ Phase 4 test
TESTED (@work-item-id 付きテストあり / green)
```

`type: chore` は DRAFTED で完結。`type: fix` は DRAFTED → REFLECTED → IMPLEMENTED の簡略パス。`status` は PhaseGate が自動更新します。

`phasegate work-items:status --dry-run` で current status / derived status / reason / next action / structured missing evidence を確認できます。単一 WI に絞る場合は `--id WI-XXX`、CI 風に stale status を検出する場合は `--fail-on-stale`、`description.md` frontmatter の `status:` 行だけを書き戻す場合は `--apply` を指定します。標準 L2 validation は `L2-014 work-item-status-staleness` も実行し、stale WI status を pre-commit / CI の fail signal として扱います。

詳細仕様: [`docs/folder_management_rules.md`](docs/folder_management_rules.md)

---

## 導入後のプロジェクト構造

```
your-project/
├── phasegate.config.json
├── docs/
│   ├── folder_management_rules.md          # WI 仕様の正本（init で配置）
│   ├── principles/                         # 開発原則（init で配置・immutable）
│   ├── inception/                          # AIDLC スキルが生成
│   │   ├── _shared/                        # 横断計画
│   │   ├── _cross/{WI-XXX}/                # cross-unit WI
│   │   └── {unit}/{WI-XXX}/                # Unit 所有 WI
│   ├── product/                            # 確定設計（累積更新）
│   │   ├── product_overview.md
│   │   ├── user_stories.md
│   │   ├── units/{unit}.md
│   │   └── construction/{unit}/
│   │       ├── domain_model.md
│   │       ├── logical_design.md
│   │       └── ...
│   └── ADR/
├── src/                                    # 実装コード（@unit/@layer 必須）
├── .claude/{settings.json, skills/}
├── .codex/{hooks.json, skills/}            # --agent codex|both 時
└── skills/                                 # init で再生成可能
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

## 既知の制約とロードマップ

主要な導入パスはそのまま利用できますが、一部の機能は user 側の配線が必要、または今後の minor release での改善対象です。各 Work Item は `docs/inception/_cross/WI-XXX/description.md` に起票済みです。

| Work Item | 内容 |
|---|---|
| **[WI-128](docs/inception/_cross/WI-128/description.md)** | L4 運用ロールアウトの仕上げ。`doc-freshness` / `pointer-validation` は L4-004 / L4-005 として登録済みで、`p2:*` 互換コマンドも維持。WI-033 は完了済みとして閉じ、残りの scheduling / default / 運用 docs は後続 WI で扱う。@work-item-id WI-128 |

L3 Nyquist Validation の `requirement-test-matrix.json` 自動生成はまだ未自動化です。[WI-125](docs/inception/_cross/WI-125/description.md) と L3 guide を参照してください。現時点では手動セットアップで利用できます。

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
