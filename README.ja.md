# Phasegate

**Phasegate — AI-Agnostic Quality Defense Toolkit**

AIエージェント（Claude Code, Codex, Cursor, その他）が生成するコードと設計の構造的整合性を、エージェント非依存で機械的に保証し続けるポータブルな品質防御ツールキットです。

> **Core Value**: 「設計意図とコードの構造的整合性を、機械的に保証し続けること」
>
> どのAIエージェントで開発しても、このハーネスをプロジェクトに導入すれば、設計意図とコードの構造的整合性が壊れない。

---

## 目次

- [何ができるのか](#何ができるのか)
- [アーキテクチャ — 5層防御モデル](#アーキテクチャ--5層防御モデル)
- [前提条件](#前提条件)
- [インストール](#インストール)
- [セットアップ](#セットアップ)
- [phasegate.config.json](#harnessconfigjson)
- [CLIコマンドリファレンス](#cliコマンドリファレンス)
- [AIDLCプロセス — スキル実行順序](#aidlcプロセス--スキル実行順序)
- [スキル一覧 (28スキル)](#スキル一覧-28スキル)
- [メタデータ規約 (@unit / @layer / @story)](#メタデータ規約-unit--layer--story)
- [Claude Code Hooks 統合](#claude-code-hooks-統合)
- [Quick Mode](#quick-mode)
- [プリセット](#プリセット)
- [CI/CD テンプレート](#cicd-テンプレート)
- [回帰テスト (K1-K15)](#回帰テスト-k1-k15)
- [ディレクトリ構造](#ディレクトリ構造)
- [バージョン管理](#バージョン管理)

---

## 何ができるのか

| 機能 | 説明 |
|---|---|
| **L1 Biome AST 検証** | エディタ保存時・CI実行時にimportグラフ解析・レイヤー違反・AIアンチパターンを検出 |
| **L2 Pre-commit バリデータ** | コミット前にPhase Gate・メタデータ完全性・テスト品質ルールを強制 |
| **L3 CI バリデータ** | PRマージ前にセキュリティ・パフォーマンス・カバレッジ・Nyquist要件トレーサビリティを検証 |
| **L4 スケジュール検証** | 週次で設計-実装乖離・文書間整合性・デッドコードを検出 |
| **28スキル** | product-architectからstory-implementorまで、設計→実装の全フェーズをカバー |
| **Phase Dependency Model** | 設計フェーズ間の前提条件を機械的に強制（設計なしの実装を物理的に拒否） |
| **Quick Mode** | バグ修正・テスト追加などの軽微な変更では最小限のゲートで高速実行 |
| **Claude Code Hooks** | ファイル書き込み時の自動Biome lint、セッション終了時の全テストグリーン強制 |
| **HarnessError** | 全バリデータのエラーにADR参照と修正コード例を付与。AIエージェントが自己修正可能 |
| **Nyquist Validation** | 要件→テストの双方向トレーサビリティを`requirement-test-matrix.json`で保証 |
| **Cascade Updater** | 下位フェーズの発見を上位設計文書に自動フィードバック |
| **Regression Suite** | K1-K15非交渉要件・GnGゲート・エージェント非依存性を回帰テストで継続検証 |
| **カスタムフェーズゲート** | `phasegate.config.json` の `gates[]` で独自のフェーズゲートを定義可能。デフォルトはAIDLCフェーズ依存 |
| **保護ファイル制御** | `protectedFiles.exclude` でAI書き込みから保護するファイルを設定 |
| **Bash書き込み検出** | シェル経由のファイル書き込み（`sed -i`, `tee`, `cp`, `mv`, リダイレクト等）を検出してブロック |

---

## アーキテクチャ — 5層防御モデル

```
╔══════════════════════════════════════════════════════════════╗
║  L0  HOOKS ENGINE: Agent Hook Configuration                  ║
║  ─────────────────────────────────────────────────────────  ║
║  hook-config        .harness-hooks.yml設定検証              ║
║  gate-check         完了ゲートチェック                      ║
║                                                             ║
║  実行: npx phasegate validate --layer L0                      ║
╠══════════════════════════════════════════════════════════════╣
║  L1  EDITOR TIME: Biome AST Rules                           ║
║  ─────────────────────────────────────────────────────────  ║
║  require-unit-comment   require-layer-comment               ║
║  no-layer-violation     enforce-folder-structure            ║
║  no-any-abuse           no-ghost-file                       ║
║  no-comment-flood       no-code-duplication                 ║
║  + it-test-mock-detection  + stub-comment-detection         ║
║                                                             ║
║  実行: npx phasegate lint                                     ║
╠══════════════════════════════════════════════════════════════╣
║  L2  PRE-COMMIT: Validators                                 ║
║  ─────────────────────────────────────────────────────────  ║
║  phase-gate    設計→実装の順序強制                          ║
║  metadata      @unit/@layer/@US-XXX/@story の完全性検証     ║
║  test-quality  AAA / actual / single-act / no-domain-mock   ║
║                                                             ║
║  実行: npx phasegate validate --layer L2                      ║
╠══════════════════════════════════════════════════════════════╣
║  L3  CI/CD: Validators                                      ║
║  ─────────────────────────────────────────────────────────  ║
║  security      ハードコード秘密・SQLインジェクション検出    ║
║  performance   ループ内await・N+1クエリ・バンドルサイズ     ║
║  coverage      カバレッジ閾値 (standard: 90% / strict: 95%) ║
║  nyquist       要件→テスト双方向トレーサビリティ検証        ║
║                                                             ║
║  実行: npx phasegate validate --layer L3                      ║
╠══════════════════════════════════════════════════════════════╣
║  L4  SCHEDULED: Validators                                  ║
║  ─────────────────────────────────────────────────────────  ║
║  drift-detect      設計↔コード双方向乖離検出               ║
║  consistency-check 文書間レイヤー整合性チェック             ║
║  dead-code         未使用エクスポート・到達不能コード検出   ║
║                                                             ║
║  実行: npx phasegate validate --layer L4                      ║
╚══════════════════════════════════════════════════════════════╝
```

各バリデータは統一された`HarnessError`フォーマットでエラーを報告します。

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

## 前提条件

| 要件 | バージョン |
|---|---|
| Node.js | 18以上 |
| npm | 9以上 |
| TypeScript | 5.x |

---

## インストール

```bash
npm install --save-dev phasegate
```

`package.json` に直接記載する場合:

```json
{
  "devDependencies": {
    "phasegate": "^0.31.0"
  }
}
```

---

## セットアップ

### 1. プロジェクト初期化

```bash
npx phasegate init --name <プロジェクト名>
```

実行されること:
- `.claude/skills/` に28スキルを展開
- プロジェクトルートに `phasegate.config.json` を生成

### 2. 設計原則ドキュメントをコピー

```bash
# プロジェクトの docs/ 配下にコピー
cp node_modules/phasegate/docs/folder_management_rules.md docs/
mkdir -p docs/principles
cp node_modules/phasegate/docs/principles/*.md docs/principles/
```

### 3. プロダクト概要を作成

```
docs/product/
└── <your_product>_overview.md   # プロダクト定義（AIDLCの起点）
```

### 4. Claude Codeを起動してAIDLCを開始

```bash
claude  # プロジェクトルートで起動
```

セッション内で `/product-architect` を実行してAIDLCを開始します。

### スキルのアップデート

```bash
# ハーネスを更新後、スキルを最新版に同期
npm update phasegate
npx phasegate update-skills
```

---

## phasegate.config.json

プロジェクトルートに配置する品質設定のSingle Source of Truth。

```jsonc
{
  "project": { "name": "my-project", "preset": "standard" },
  "layers": {
    "L0": { "enabled": false },
    "L1": { "enabled": true },
    "L2": { "enabled": true },
    "L3": { "enabled": true },
    "L4": { "enabled": false }
  },
  "quickMode": {
    "allowedCategories": ["bugfix", "docs", "test", "config"],
    "maintainedLayers": ["L1", "L2"],
    "relaxedGates": ["phase-gate", "2-phase-execution"]
  },
  "phaseDependencies": {
    "preset": "standard",
    "override": false,
    "storyReflection": { "enabled": true }
  },
  "protectedFiles": {
    "exclude": ["tsconfig.json", "package.json"]
  },
  "paths": {
    "designDocs": "docs/product/construction",
    "inceptionDocs": "docs/inception"
  }
}
```

---

## CLIコマンドリファレンス

```bash
npx phasegate <command> [options]
```

### セットアップ

| コマンド | 説明 |
|---|---|
| `init --name <name>` | スキル展開 + phasegate.config.json 生成 |
| `update-skills` | スキルを最新版に再デプロイ |
| `list-features` | 利用可能な機能一覧 |
| `enable-feature <name>` | 機能を有効化 |
| `disable-feature <name>` | 機能を無効化 |

### 品質チェック

| コマンド | 説明 | オプション |
|---|---|---|
| `lint` | L1 Biome AST チェック | `--target <path>` `--json` |
| `validate` | L2〜L4バリデータ実行 | `--layer L1\|L2\|L3\|L4\|all` `--unit <name>` `--format human\|agent\|ci` |
| `ci-check` | CIフルチェック (L2-L4) | `--quick` `--fail-on-reject` `--dry-run` `--files` |
| `validate-metadata <files>` | 実装メタデータ検証 | |
| `check-phase-gate` | フェーズゲートチェック | `--level 1\|2\|3` |

### harness-api コマンド

| コマンド | 説明 | オプション |
|---|---|---|
| `phasegate:status` | ハーネス全体の健全性サマリ | `--json` |
| `phasegate:check-ready` | 全storyのPhase Gate通過状態 | `--json` |
| `phasegate:check-phase` | 指定Unitの現在フェーズ | `--unit <unitId>` `--json` |
| `phasegate:ci-check` | 全L3バリデータ実行結果 | `--json` |
| `phasegate:detect-drift` | 設計-コード乖離レポート | `--json` |
| `phasegate:lint` | harness-api経由のlint | `--target <path>` `--json` |
| `phasegate:complete-check` | L2-L4全チェック | `--json` |
| `phasegate:impact-analysis` | ストーリー影響範囲分析 | `<storyId>` `--json` |

### ADR管理

| コマンド | 説明 | オプション |
|---|---|---|
| `list-adrs` | ADR一覧 | `--status Proposed\|Accepted\|Deprecated\|Superseded` |
| `validate-adr` | ADR検証 | `--all` または `<adrRef>` |

### HarnessError

| コマンド | 説明 | オプション |
|---|---|---|
| `list-errors` | エラー定義一覧 | `--format human\|json` `--layer L0-L4` |
| `render-errors` | エラーを人間/AI/CI向けに出力 | `--format human\|agent\|ci` |
| `validate-fix` | 修正コード例の検証 | `--code <code>` |

### スキル品質

| コマンド | 説明 | オプション |
|---|---|---|
| `skill:execute-tdd-cycle` | TDDサイクル実行 | `--unit` `--story` `--desc` `--phase RED\|GREEN\|REFACTOR` `--passed` |
| `skill:check-coverage` | テストカバレッジ検証 | `--story <storyId>` `--json` |
| `skill:collect-lessons` | エージェントLesson収集 | `--story <storyId>` `--sources <paths>` `--write-artifact` |
| `skill:apply-cascade-update` | 上位設計への影響反映 | `--story <storyId>` `--dry-run` |
| `skill:validate-structure` | スキル構造検証 | `--file <path>` `--json` |

### CI/CD

| コマンド | 説明 | オプション |
|---|---|---|
| `ci:generate-template` | CI/CDテンプレート生成 | `--preset <id>` `--type <type>` `--render` `--json` |
| `ci:migrate-agents-md` | AGENTS.mdポインタ型移行 | `--dry-run` `--validate-only` `--json` |
| `ci:check-repetition` | 反復エラー検出 | `--code <errorCode>` `--reset` `--json` |

### 回帰テスト

| コマンド | 説明 |
|---|---|
| `regression:run-k-requirements` | K1-K15非交渉要件の回帰テスト |
| `regression:run-gng-gate` | Go/No-Go Gate 3条件の回帰テスト |
| `regression:run-agent-guard` | エージェント非依存性ガード |
| `regression:run-k14-k15` | K14/K15 (Phase Dependency / Plan文書) 回帰テスト |
| `regression:configure-ci-gate` | CIゲート設定 |
| `regression:analyze-migration` | v0テスト移行分析 |
| `regression:migrate-v0-tests` | v0テスト移行実行 |

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
| `p2:generate-e2e-template` | E2Eテストテンプレート生成 | `--phase <phase>` `--output <path>` |

---

## AIDLCプロセス — スキル実行順序

AIDLC (AI-Driven Development Life Cycle) は設計文書が存在しない状態での実装を物理的に禁止するプロセスです。Phase Dependency Modelにより上位フェーズの成果物なしに下位フェーズへの移行は不可能です。

```
Level 1: 要求定義 — inception/_shared/ に配置
─────────────────────────────────────────────
/product-architect   プロダクト全体像の定義
/story-writer        Who/What/Why形式のユーザーストーリー作成
/story-mapper        MVPスコープ整理・優先順位定義
/unit-designer       ストーリーを独立構築可能なUnitにグルーピング

Level 2: Unit横断設計 — inception/{unit}/ に配置
─────────────────────────────────────────────
/domain-designer     DDDドメインモデル設計（集約・Entity・VO・Event）
/logical-designer    Hexagonal Architecture設計（Port & Adapter）
/mock-designer       UIモックアップ設計
/environment-designer ローカル開発環境・インフラ設計
/it-test-designer    統合テストケース設計
/unit-test-designer  ユニットテストケース設計
/it-test-logic-designer    IT Vitest実装ロジック設計
/unit-test-logic-designer  UT Vitest実装ロジック設計

Level 3: ストーリー実装 — inception/{unit}/{US-XXX}/ に配置
─────────────────────────────────────────────
/logical-designer    US固有の論理設計
/scenario-test-designer    E2Eシナリオテストケース設計
/scenario-test-logic-designer  PlaywrightE2Eテスト実装ロジック設計
/uiux-designer       最終UI/UX定義
/implementation-readiness-checker  実装開始前の準備状況検証
/story-implementor   TDD実装 (Red→Green→Refactor)
```

**フェーズ間の依存ルール:**
- Level 2はLevel 1の`unit-designer`完了が必須
- Level 3はLevel 2の`domain_model.md`・`logical_design.md`の存在が必須
- `story-implementor`の前に少なくとも1つのテスト設計フェーズが必須（緩和不可）

---

## スキル一覧 (28スキル)

### Foundation (4スキル)

| スキル | 説明 |
|---|---|
| `/product-architect` | ビジネス要求からプロダクト全体像を定義 |
| `/story-writer` | Who/What/Why形式のユーザーストーリーと受け入れ基準を作成 |
| `/story-mapper` | ストーリーのMVPスコープ整理・優先順位定義 |
| `/unit-designer` | ストーリーを独立構築可能なUnitにグルーピングし統合契約を定義 |

### Design (5スキル)

| スキル | 説明 |
|---|---|
| `/domain-designer` | DDDドメインモデル設計（集約・Entity・VO・イベント） |
| `/logical-designer` | Hexagonal Architecture設計（Port & Adapter）。横断設計とUS固有設計の2モード |
| `/mock-designer` | UIモックアップ設計。UI/UXの検証とフィードバック |
| `/uiux-designer` | テストケース・論理設計・既存UIを加味して最終UI/UX定義を策定 |
| `/environment-designer` | ローカル開発環境・インフラ構成設計 |

### Test Engineering (7スキル)

| スキル | 説明 |
|---|---|
| `/unit-test-designer` | ドメインモデルからユニットテストケースを設計 |
| `/it-test-designer` | 論理設計から統合テストケースを設計 |
| `/scenario-test-designer` | E2Eシナリオテストケースを設計 |
| `/unit-test-logic-designer` | Vitest実装ロジックを設計（疑似コード付き詳細設計） |
| `/it-test-logic-designer` | IT Vitest実装ロジックを設計 |
| `/scenario-test-logic-designer` | Playwright実装ロジックを設計 |
| `/test-coverage-checker` | テストカバレッジ検証・Nyquist Validation |

### Implementation (4スキル)

| スキル | 説明 |
|---|---|
| `/story-implementor` | 論理設計+環境設計に基づくTDD実装。Atomic commit付き |
| `/quick-implementor` | Quick Mode下でのad-hoc実装（バグ修正・ドキュメント修正等） |
| `/implementation-planner` | Unit仕様とドメインモデル設計を元に実装計画を立案 |
| `/implementation-readiness-checker` | 実装開始前の準備状況を自動検証 |

### Verification (8スキル)

| スキル | 説明 |
|---|---|
| `/consistency-checker` | AIDLC設計文書群のレイヤー間整合性チェック・矛盾/漏れ検出 |
| `/cascade-updater` | 下位フェーズの発見・変更を上位設計文書にフィードバック |
| `/codex-delegator` | Codex CLIにタスクを委任し、Claude Codeがマネージャーとして品質管理 |
| `/codebase-mapper` | 全ソースファイルの @unit/@layer アノテーションを解析し構造マップを生成 |
| `/doc-freshness-checker` | 設計文書の鮮度チェック（L4バリデータ拡張） |
| `/pointer-validator` | 設計文書内のファイルポインタ有効性を検証 |
| `/engineering-perspective` | ケントベック+マーティンファウラー+アンクルボブ+エリックエヴァンスの視点で設計レビュー |
| `/skill-creator` | AgentSkillsを作成・更新 |

---

## メタデータ規約 (@unit / @layer / @story)

全ソースファイルの先頭にメタデータコメントを記載します。これによりL1検証・トレーサビリティ・drift-detectionが機能します。

### 実装ファイル

```typescript
// @unit config-foundation
// @layer domain

export class ConfigSchema { ... }
```

`@layer` の有効値: `domain` / `application` / `infrastructure` / `presentation`

### テストファイル

```typescript
// @unit config-foundation
// @layer domain
// @story US-001

describe('ConfigSchema', () => {
  it('バリデーションルールが正しく適用される', () => {
    // Arrange
    const actual = ...;

    // Act
    ...

    // Assert
    expect(actual).toBe(...);
  });
});
```

### 設計文書 (累積更新時)

`product/construction/{unit}/` 配下の設計文書を更新する際は、更新箇所に起源USを記録します。

```markdown
## エンティティ: ConfigSchema

@US-001
- name: string（必須）
- version: SemVer

@US-003
- validationRules: ValidationRule[]（バリデーション拡張）
```

---

## Claude Code Hooks 統合

`.claude/settings.json` に以下を設定するとClaude Codeとのネイティブ統合が有効になります。

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/post-tool-use-hook.ts"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/stop-hook.ts"
        }]
      }
    ]
  }
}
```

| Hook | タイミング | 動作 |
|---|---|---|
| **PreToolUse** | ファイル書き込み前 | Phase Gate強制・保護ファイルへの変更をブロック・**Bash経由の書き込み検出（`sed -i`, `tee`, `cp`, `mv`, リダイレクト）**。ブロック時はアクショナブルなエラーメッセージ（違反理由・不足成果物・次に使うべきスキル）を返却 |
| **PostToolUse** | ファイル書き込み後 | Biome ASTルールを自動実行、違反があれば即時フィードバック |
| **Stop** | セッション終了前 | `phasegate:complete-check` (L2-L4全チェック) を実行、全グリーンでないとセッション終了を保留 |

### PreToolUse エラーメッセージ (v0.9.0)

PreToolUse Hook がブロックした際、AIエージェントが自律的に正しい行動を取れるよう、具体的なエラーメッセージを返します。

**フェーズゲート違反:**

```
フェーズゲート違反: scripts/harness/config-foundation/domain/test.ts
対象スコープ: Level 3 (実装), Unit: config-foundation
ブロック理由:
  - 成果物が不足しています: docs/product/construction/config-foundation/domain_model.md
  - plan文書が不足しています: 2:logical-designer
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  実行例: /story-implementor --unit config-foundation
```

**保護ファイル:**

```
保護ファイルへの書き込みがブロックされました: package.json
バージョン変更を含む package.json の更新は /quick-implementor スキルを使用してください。
```

対象の保護ファイルに応じて、`/quick-implementor`、`/update-config`、CLI経由の変更など適切なガイダンスが表示されます。

### オプション: シェルスクリプトフック

`.claude/scripts/` 配下に以下のオプションフックを配置できます。

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

## Quick Mode

軽微な変更（バグ修正、ドキュメント修正、テスト追加、設定変更）に対してハーネスの一部を緩和するモード。

```bash
npx phasegate ci-check --quick
```

| レイヤー | 通常モード | Quick Mode |
|---|---|---|
| L1 Biome | 有効 | **有効**（維持） |
| L2 Pre-commit | 有効 | **有効**（維持） |
| L3 CI | 有効 | **securityのみ** |
| L4 Scheduled | 有効 | **スキップ** |
| Phase Gate | 必須 | **緩和** |
| 2-Phase Execution | 必須 | **緩和** |

`phasegate.config.json` でQuick Modeの適用条件を定義します。

```jsonc
{
  "quickMode": {
    "allowedCategories": ["bugfix", "docs", "test", "config"],
    "maintainedLayers": ["L1", "L2"],
    "relaxedGates": ["phase-gate", "2-phase-execution"]
  }
}
```

**Quick Mode適用の除外** (フルハーネス必須):
- 新機能追加
- API契約変更
- 新ドメインモデル追加

---

## プリセット

`phasegate.config.json` のプリセットは **2 系統** あります。

### `project.preset` — レイヤー厳密度（L1-L4 有効化とカバレッジ閾値）

| プリセット | 用途 | 有効レイヤー | カバレッジ閾値 |
|---|---|---|---|
| **minimal** | 学習・プロトタイプ | L1, L2 | — |
| **standard** | 通常開発 | L1, L2, L3 | 90% |
| **strict** | 本番・エンタープライズ | L1-L4 | 95% |

`strict` プリセット追加機能:
- L4 スケジュール検証（週次drift-detect・dead-code検出）
- `agentLessonCollection: true`
- `bundleSizeLimit: 500 KB`
- `deadCodeGC: true`

### `phaseDependencies.preset` — フェーズゲート構成と storyReflection デフォルト

`project.preset` とは独立。`"default"` は後方互換のため `"full"` にフォールバックされます。

| プリセット | Phase 3 ゲート | storyReflection デフォルト | 用途 |
|---|---|---|---|
| **full** | 全 AIDLC ゲート | 有効 — `logical_design` + `domain_model` required、`uiux` optional | AIDLC フルセレモニー（旧 `default`） |
| **standard** | コアゲート | 有効 — `logical_design` required、`domain_model` optional | 通常開発・中庸な厳密度 |
| **minimal** | なし | 無効 — inception → product 反映強制なし | プロトタイプ・試行錯誤段階 |
| **custom** | ユーザー定義 | `storyReflection.mappings` で定義 | 完全カスタマイズ（`override: true` 必須） |

`storyReflection` は inception の US/issue 設計が `docs/product/construction/{unit}/` に反映されていない場合に `src/{unit}/*` への Write/Edit をブロックします。config で省略した場合はプリセットのデフォルト mappings がゼロコンフィグで自動適用されます。`cascade-updater` スキルがこのゲートを通過する標準手段です。詳細は [ADR-013](docs/ADR/ADR-013-story-reflection-gate.md) と [Configuration guide](docs/guide/configuration.md#storyreflection-inception--product-gate) を参照してください。

---

## カスタムフェーズゲート

デフォルトでは **AIDLCフェーズ依存モデル** が適用され、設計文書なしでの実装ファイル書き込みがブロックされます。`standard` または `full` プリセットでゼロコンフィグで動作します。

AIDLCを使わないプロジェクトでは、`phasegate.config.json` の `gates[]` 配列で **独自のゲート** を定義できます:

```jsonc
{
  "phaseDependencies": {
    "preset": "custom",
    "override": true,
    "gates": [
      {
        "name": "schema-first",
        "level": 3,
        "blocks": ["src/api/**/*.ts"],
        "requires": ["docs/api/openapi.yaml"],
        "description": "API実装にはOpenAPIスキーマが必要"
      }
    ]
  }
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | string | ゲートの一意識別子 |
| `level` | 1 \| 2 \| 3 | フェーズレベル（上位レベルは下位レベルのゲート通過が前提） |
| `blocks` | string[] | このゲートが保護するファイルのglobパターン |
| `requires` | string[] | ブロック対象パスへの書き込み前に存在が必要なファイル |
| `dependsOn` | string[] | 事前に通過が必要な他のゲート名 |
| `description` | string | ゲートの説明 |

ゲートは **DAG**（有向非巡回グラフ）を形成します。循環依存は設定読み込み時に拒否されます。

---

## CI/CD テンプレート

```bash
# 3種のテンプレートを生成
npx phasegate ci:generate-template --type github-actions
npx phasegate ci:generate-template --type pre-commit
npx phasegate ci:generate-template --type weekly-check
```

| テンプレート | 用途 | 配置先 |
|---|---|---|
| `aidlc-gate.yml` | PR検証ワークフロー | `.github/workflows/aidlc-gate.yml` |
| `consistency-check.yml` | 週次整合性チェック（乖離検出時Issue自動作成） | `.github/workflows/consistency-check.yml` |
| `.husky/pre-commit` | Pre-commitフック | `.husky/pre-commit` |

手動配置する場合:

```bash
# aidlc-gate.yml を .github/workflows/ にコピー
npx phasegate ci:generate-template --type github-actions --render > .github/workflows/aidlc-gate.yml

# pre-commit フックを設定
npx phasegate ci:generate-template --type pre-commit --render > .husky/pre-commit
chmod +x .husky/pre-commit
```

---

## 回帰テスト (K1-K15)

非交渉要件が継続的に満たされているかを回帰テストで検証します。

```bash
# K1-K13 非交渉要件の回帰テスト（16件）
npx phasegate regression:run-k-requirements

# Go/No-Go Gate 品質側3条件（3件）
npx phasegate regression:run-gng-gate

# K14（Phase Dependency Model）/ K15（Plan文書必須）（2件）
npx phasegate regression:run-k14-k15

# エージェント非依存性ガード（3件）
npx phasegate regression:run-agent-guard
```

JSON出力:

```bash
npx phasegate regression:run-k-requirements --format json
```

**非交渉要件 (K1-K15) 概要:**

| # | 要件 |
|---|---|
| K1 | 5層防御モデル（L0-L4） |
| K2 | Phase Gate（設計→実装の順序強制） |
| K3 | Biome AST解析（importグラフ+循環依存検出） |
| K3.5 | @unit/@layer/@US-XXXメタデータ |
| K4 | テスト品質ルール（AAA / actual / no-domain-mock等） |
| K5 | DDD設計スキル群 |
| K6 | 2-Phase Execution（AI安全メカニズム） |
| K7 | Document Split（inception/product分離） |
| K8 | Cascade Updater |
| K9 | Agent-Lesson System |
| K10 | Security/Performance検出 |
| K11 | Drift Detection（双方向） |
| K12 | Consistency Checker |
| K13 | phasegate.config.json（品質設定SSOT） |
| K14 | Phase Dependency Model（3層フェーズ構造） |
| K15 | Plan文書の必須生成 |

---

## ディレクトリ構造

### ハーネスの内部構造

```
phasegate/
├── scripts/harness/
│   ├── main.ts                      # CLIエントリポイント
│   ├── harness-error/               # HarnessError定義・ADR参照
│   ├── config-foundation/           # phasegate.config.json 解析・スキーマ
│   ├── traceability-model/          # @unit/@layer/@story メタデータ管理
│   ├── phase-dependency-model/      # フェーズ依存関係・Phase Gate
│   ├── adr-foundation/              # ADR管理
│   ├── biome-ast-engine/            # Biome AST解析エンジン
│   ├── validator-system/            # L0-L4バリデータシステム
│   ├── nyquist-validation/          # 要件-テストトレーサビリティ
│   ├── harness-api/                 # harness:* コマンドCLI層
│   ├── quick-mode/                  # Quick Mode判定・緩和実行
│   ├── agent-integration/           # Claude Code Hooks アダプタ
│   ├── skill-quality/               # TDDサイクル・カバレッジ・Cascade Update
│   ├── ci-governance/               # CI/CDテンプレート・反復エラー監視
│   ├── regression-suite/            # K1-K15回帰テストスイート
│   ├── fuse-hooks-engine/           # Hooks Engine (.harness-hooks.yml・完了ゲート)
│   └── phase2-extensions/           # freshness/pointer/e2e-template (v2)
├── skills/                          # 28スキル (npx phasegate init で .claude/skills/ に展開)
├── templates/
│   └── phasegate.config.json          # 設定テンプレート
└── docs/
    ├── principles/                  # アーキテクチャ哲学・テスト規約
    └── product/                     # ハーネス自身の設計文書
```

### 導入後のプロジェクト構造

```
your-project/
├── phasegate.config.json              # 品質設定（ハーネスのSSoT）
├── docs/
│   ├── folder_management_rules.md   # ドキュメント配置ルール
│   ├── principles/
│   │   ├── architecture-philosophy.md
│   │   └── testing-rules.md
│   ├── product/                     # 確定版設計文書
│   │   ├── <product>_overview.md
│   │   ├── units/                   # Unit仕様書
│   │   │   └── {unit_name}.md
│   │   └── construction/            # レイヤー設計文書
│   │       └── {unit_name}/
│   │           ├── domain_model.md
│   │           ├── logical_design.md
│   │           └── ...
│   ├── inception/                   # AIDLCが生成する設計計画文書
│   │   ├── _shared/                 # Level 1 (Product全体設計)
│   │   │   ├── product_overview_plan.md
│   │   │   └── unit_design_plan.md
│   │   └── {unit_name}/             # Level 2/3 (Unit/US単位)
│   │       ├── domain_model_plan.md
│   │       └── {US-XXX}/
│   │           └── tdd_implementation_plan.md
│   └── ADR/                         # Architecture Decision Records
│       └── ADR-001-*.md
├── src/                             # 実装コード（@unit/@layer 必須）
└── .claude/
    ├── CLAUDE.md
    ├── settings.json                # Hooks設定
    └── skills/                      # npx phasegate init で展開（gitignore推奨）
```

### .gitignore 推奨設定

```
node_modules/
.claude/skills/          # npx phasegate init で再生成可能
dist/
reports/
.harness/
```

---

## バージョン管理

Semantic Versioning (MAJOR.MINOR.PATCH) を採用しています。

| 変更種別 | バージョン |
|---|---|
| バグ修正・小改善 | PATCH (例: v1.1.0 → v1.1.1) |
| スキル追加・新コマンド追加 | MINOR (例: v1.1.0 → v1.2.0) |
| 設定スキーマ変更など破壊的変更 | MAJOR (例: v1.x.x → v2.0.0) |

### リリース手順 (ハーネス側)

```bash
npm version patch   # または minor / major
git push origin main --tags
```

### アップデート手順 (利用側プロジェクト)

```bash
# semver範囲内で最新版に更新
npm update phasegate

# スキルを最新版に同期
npx phasegate update-skills
```

> メジャーバージョンアップ時のみ `package.json` の `semver:^X.Y.Z` を手動で更新してください。

---

## ロードマップ

| バージョン | 内容 |
|---|---|
| **v1.6.0 (v1 MVH)** | L1-L4・28スキル・Claude Code Hooks・Nyquist Validation・K1-K15回帰テスト完備 |
| **v2.0.0** | Hooks Engine（.harness-hooks.yml設定・完了ゲート）・Phase 2拡張（doc-freshness・pointer-validator・Playwright E2Eテンプレート） |

---

*Last updated: 2026-04-06 — v0.31.0*
