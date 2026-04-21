# Phasegate 開発者ガイド

phasegate 自体の開発・メンテナンスに関するドキュメントです。phasegate を **利用する** 場合は [README.ja.md](README.ja.md) を参照してください。

---

## 目次

- [開発環境セットアップ](#開発環境セットアップ)
- [内部アーキテクチャ](#内部アーキテクチャ)
- [ADR 一覧](#adr-一覧)
- [CLIコマンド一覧](#cliコマンド一覧)
- [Hook システム詳細](#hook-システム詳細)
- [Quick Mode 内部仕組み](#quick-mode-内部仕組み)
- [回帰テスト (K1-K15)](#回帰テスト-k1-k15)
- [テストインフラストラクチャ](#テストインフラストラクチャ)
- [Feature Flags 実装状態](#feature-flags-実装状態)
- [CI/CD](#cicd)
- [開発中・計画中の機能](#開発中計画中の機能)
- [既知の課題](#既知の課題)
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

phasegate は **Clean Architecture + DDD** で構成されています。各機能は独立した **Unit** に分離され、`scripts/harness/` 配下に配置されています。

### 依存方向

```
domain → application → infrastructure / presentation（逆方向禁止）
```

### Unit 一覧

15 の本番 Unit が存在し、全 Unit が完全なレイヤー実装を持ちます。

| Unit | 責務 | main.ts 登録 |
|---|---|---|
| `config-foundation` | phasegate.config.json 解析・スキーマ検証・プリセット | Yes |
| `harness-error` | HarnessError 定義・ADR 参照・修正コード例 | Yes |
| `traceability-model` | @unit/@layer/@story メタデータ管理 | Yes |
| `phase-dependency-model` | フェーズ依存関係・Phase Gate・storyReflection | Yes |
| `adr-foundation` | ADR 管理 | Yes |
| `biome-ast-engine` | Biome AST 解析エンジン（import グラフ・L1 ルール） | Yes |
| `validator-system` | L0-L4 バリデータシステム | Yes |
| `nyquist-validation` | 要件-テストトレーサビリティ（AC↔テスト双方向） | **No** (ライブラリ) |
| `harness-api` | phasegate:* コマンド CLI 層 | Yes |
| `quick-mode` | Quick Mode 判定・緩和実行 | Yes |
| `agent-integration` | Claude Code Hooks アダプタ（pre/post/stop） | **No** (Hook経由) |
| `skill-quality` | TDD サイクル・カバレッジ・Cascade Update | Yes |
| `ci-governance` | CI/CD テンプレート・反復エラー監視 | Yes |
| `regression-suite` | K1-K15 回帰テストスイート | Yes |
| `phase2-extensions` | freshness / pointer / e2e-template (v2) | Yes |

> **agent-integration** は Claude Code Hooks の presentation レイヤーから呼ばれるライブラリ Unit です（index.ts バレルエクスポート）。
> **nyquist-validation** は composition-root.ts を持つ完全実装ですが CLI 未接続です。validator-system から内部的に参照されます。

### 廃止された Unit

| Unit | 廃止バージョン | 理由 |
|---|---|---|
| `fuse-hooks-engine` | v0.10.0 | hooks-only 構成に簡素化（yaml 依存除去） |

### shared-kernel

Unit 横断の値オブジェクトを `scripts/harness/shared-kernel/` に配置:

| ファイル | 用途 |
|---|---|
| `harness-api.ts` | harness-api 共通型 |
| `quick-mode.ts` | Quick Mode 共通型 |
| `validator-system.ts` | バリデータ共通型 |

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

## ADR 一覧

全 ADR は `docs/ADR/` に配置されています。全件 **Accepted** ステータスです。

| # | タイトル | 概要 |
|---|---|---|
| ADR-001 | Four-Layer Defense Model (L1-L4) | Biome AST による 8 構造ルールのエディタ時検証 |
| ADR-002 | Pre-commit Validators (L2) | Phase Gate・メタデータ・テスト品質の強制 |
| ADR-003 | CI Validators (L3) | セキュリティ・パフォーマンス・カバレッジ・Nyquist 検証 |
| ADR-004 | Scheduled Validators (L4) | 週次ドリフト検出・一貫性チェック・デッドコード検出 |
| ADR-005 | Hexagonal Architecture | 全 Unit で Ports & Adapters パターンを採用 |
| ADR-006 | Agent Independence | バリデータはファイルシステム成果物のみに依存（エージェント非依存） |
| ADR-007 | Config Single Source of Truth | phasegate.config.json が全品質設定の SSOT |
| ADR-008 | Quick Mode | バグ修正/ドキュメント/テストでの条件付きハーネス緩和 |
| ADR-009 | DDD Tactical Patterns | Value Objects, Entities, Aggregates, Domain Services, Ports |
| ADR-010 | HarnessError fix_example | 全エラーに `fix_example` + `adr_ref` を含め AI 自己修正を支援 |
| ADR-011 | archgate Pattern | アーキテクチャルールを実行可能な Biome AST ルールとして定義 |
| ADR-012 | 2-Phase Execution | Phase 1（計画）で人間承認 → Phase 2（実装）を自動実行 |
| ADR-013 | Story Reflection Gate | inception→product ドキュメント反映の検証 |

---

## CLIコマンド一覧

### ユーザー向けコマンド

ユーザー向けコマンドの詳細は [README.ja.md](README.ja.md#cliコマンドリファレンス) を参照してください。

### 開発者向けコマンド

以下のコマンドは phasegate 自体の開発・品質保証に使用します。

#### 回帰テスト

| コマンド | 説明 |
|---|---|
| `regression:run-k-requirements` | K1-K15 非交渉要件の回帰テスト（16件） |
| `regression:run-gng-gate` | Go/No-Go Gate 3 条件（GNG-4, GNG-5, GNG-8） |
| `regression:run-agent-guard` | エージェント非依存性ガード（3件） |
| `regression:run-k14-k15` | K14/K15 (Phase Dependency / Plan 文書) 回帰テスト |
| `regression:configure-ci-gate` | CI ゲート設定（`--suites <ids>` `--threshold <n>`） |
| `regression:analyze-migration` | v0 テスト移行分析（`--dry-run`） |
| `regression:migrate-v0-tests` | v0 テスト移行実行（`--confirm`） |

#### Hooks Engine

| コマンド | 説明 |
|---|---|
| `hooks:config validate` | .harness-hooks.yml の検証 |
| `hooks:gate-check --story <id>` | 完了ゲートチェック |

#### Phase 2 拡張

| コマンド | 説明 | オプション |
|---|---|---|
| `p2:check-freshness` | 設計文書の鮮度チェック | `--pattern <glob>` `--dry-run` `--format text\|json` |
| `p2:validate-pointers` | ドキュメント内ファイルポインタ検証 | `--include-urls` `--format text\|json` |
| `p2:generate-e2e-template` | E2E テストテンプレート生成 | `--phase <phase>` `--output <path>` |

#### スキル品質

| コマンド | 説明 | オプション |
|---|---|---|
| `skill:execute-tdd-cycle` | TDD サイクル実行 | `--unit` `--story` `--desc` `--phase RED\|GREEN\|REFACTOR` `--passed` |
| `skill:check-coverage` | テストカバレッジ検証 | `--story <storyId>` `--json` |
| `skill:collect-lessons` | エージェント Lesson 収集 | `--story <storyId>` `--sources <paths>` `--write-artifact` |
| `skill:apply-cascade-update` | 上位設計への影響反映 | `--story <storyId>` `--dry-run` |
| `skill:validate-structure` | スキル構造検証 | `--file <path>` `--json` |

#### CI/CD

| コマンド | 説明 | オプション |
|---|---|---|
| `ci:generate-template` | CI テンプレート生成 | `--preset <id>` `--type aidlc-gate\|consistency-check\|pre-commit` `--render` `--json` |
| `ci:migrate-agents-md` | AGENTS.md マイグレーション | — |
| `ci:check-repetition` | 反復エラー検出 | `--code <errorCode>` `--reset` `--json` |
| `baseline` | リトロフィット用 baseline スナップショット (`.phasegate/baseline.json`) を生成（ISSUE-007 Wave 1, Phase A-2 grandfather）。登録済みファイルは構造的に編集されるまで `phase-gate` 対象から除外される | `--dry-run` `--force` `--paths <glob,glob,...>` `--json` |

#### Quick Mode

| コマンド | 説明 | オプション |
|---|---|---|
| `check-change-category` | 変更ファイルパスを Quick Mode カテゴリ（`api` / `domain` / `feature` / `bugfix` / `test` / `config` / `docs`）に分類し、`quickMode.fullModeRequiredWhen` で Full Mode 強制が必要かを判定（ISSUE-006 Story A） | `--paths <csv>` `--format human\|json` `--fail-on-full-required` |

#### スキル管理

| コマンド | 説明 |
|---|---|
| `skills list` | 利用可能なスキル一覧 |
| `skills info <name>` | スキル詳細表示 |

---

## Hook システム詳細

### アーキテクチャ

Claude Code の hooks 機能を使い、ツール呼び出し前後にバリデーションを実行します。

```
Claude Code
  ├─ PreToolUse (Bash)     → deny-check.sh → pre-tool-use-hook.ts
  ├─ PreToolUse (Write|Edit) → pre-tool-use-hook.ts
  ├─ PostToolUse (Write|Edit) → format-settings-hook.sh
  │                            → format-typescript-hook.sh
  │                            → analyze-errors-hook.sh
  │                            → post-tool-use-hook.ts
  └─ Stop                  → stop-hook.ts
```

### Pre-Tool-Use フロー

1. Claude Code がツールを呼び出す前に stdin で JSON を受信:
   - `tool_name`: ツール名（Bash, Write, Edit 等）
   - `tool_input`: パラメータ（file_path, command 等）

2. **Bash の場合**: `BashWriteTargetExtractor` が書き込み先を検出:
   - リダイレクト（`>`, `>>`）、`tee`, `sed -i`, `cp`, `mv` のターゲットを抽出
   - Bash を Write ツールとして「偽装」し Phase Gate チェックを適用

3. **HandlePreToolUseUseCase** が以下を順に評価:
   - 保護ファイルリスト（package.json, phasegate.config.json 等）
   - **Baseline grandfather**: `baseline.enabled` が真かつ `.phasegate/baseline.json` に登録済み sha1 と一致するファイルは `phase-gate` 対象から除外（v0.66.0 / ISSUE-007 Wave 2 / Phase A-2）
   - Phase Gate 違反（WriteTargetScope による判定）
   - **Full Mode 必須検出**: `quickMode.fullModeRequiredWhen` を変更セットに対して評価。トリガーが立つと Quick Mode → Full Mode にエスカレートしてブロック（v0.64.0 / ISSUE-006 Story B）
   - storyReflection 状態（inception→product の反映状態）

4. **ブロック判定**: `shouldBlock: true` + 理由（PHASE_GATE / PROTECTED_FILE / STORY_REFLECTION_FAILURE / FULL_MODE_REQUIRED）
   - exit code 2 でアクションをブロック

### リトロフィット baseline (`.phasegate/baseline.json`)

既存プロジェクトに phasegate を後付け導入すると、レガシーファイルが最初の編集で `phase-gate` に引っかかってしまう問題がある。`baseline` コマンドは現状のファイル sha1 をスナップショット化し、構造的に編集されるまで grandfather として除外する。

```jsonc
{
  "version": "1.0",
  "createdAt": "2026-04-21T20:56:26.843Z",
  "algorithm": "sha1",
  "files": [
    { "path": "scripts/harness/foo/domain/bar.ts", "sha1": "a35d1d68..." }
  ]
}
```

- sha1 不一致（スナップショット以降にファイルが変更されている）になった瞬間、該当ファイルは再び `phase-gate` の対象に戻る
- スナップショットに未登録の新規ファイルは最初から `phase-gate` 対象
- `phasegate.config.json` の `baseline.enabled` で仕組み全体を on/off、`baseline.path` でスナップショット位置を変更できる

### Post-Tool-Use フロー

1. Write/Edit 完了後に PostToolUse フックが起動
2. `phasegate:lint` を `--fast` フラグ（200ms タイムアウト）で実行
3. フォーマット・エラー分析フックも順次実行

### シェルスクリプトフック

`.claude/scripts/` 配下のオプションフック:

| スクリプト | トリガー | 動作 |
|---|---|---|
| `deny-check.sh` | PreToolUse (Bash) | 危険コマンド（`git reset --hard`, `rm -rf` 等）をブロック |
| `format-settings-hook.sh` | PostToolUse (Write\|Edit) | settings.json 編集時に JSON 自動整形 |
| `format-typescript-hook.sh` | PostToolUse (Write\|Edit) | TypeScript ファイルの自動フォーマット |
| `analyze-errors-hook.sh` | PostToolUse (Write\|Edit) | tsc / lint エラー検出・`as` 型アサーション検出 |

### hook-config.json

`format-typescript-hook.sh` と `analyze-errors-hook.sh` の設定:

```json
{
  "targetDirs": ["scripts/harness"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

| フィールド | 説明 | デフォルト |
|---|---|---|
| `targetDirs` | フックが適用されるディレクトリ（プロジェクトルートからの相対パス） | `[]`（空 = スキップ） |
| `formatter` | `"biome"` または `"eslint-prettier"` | `"biome"` |
| `formatterArgs` | フォーマッタに渡す引数 | `["check", "--write"]` |

---

## Quick Mode 内部仕組み

Quick Mode はファイル変更の安全性を自動判定し、バリデーションを緩和します。

### ファイル分類（QuickModeJudgmentEngine）

リスク優先度の高い順:

| カテゴリ | 判定条件 | リスク |
|---|---|---|
| `api` | `*port.ts` または `*adapter.ts` | 最高 |
| `domain` | `domain/` ディレクトリ内 | 高 |
| `feature` | domain 外の新規作成（CREATE） | 中 |
| `bugfix` | MODIFY / DELETE 操作 | 低 |
| `test` | `__tests__/` または `.test.ts` / `.spec.ts` | 低 |
| `config` | `.config.json` または `.config.ts` | 低 |
| `docs` | `docs/` ディレクトリ | 最低 |

### 3 つの却下ルール（`fullModeRequiredWhen` で設定駆動）

以下のいずれかに該当すると Quick Mode は却下され、フル検証に移行:

| ルール | 条件 | 理由 | Config flag (`quickMode.fullModeRequiredWhen.*`) |
|---|---|---|---|
| `MIXED_CHANGES` | `allowedCategories` 外のファイルが含まれる | スコープ外の変更は設計レビューが必要 | `mixedCategories` |
| `NEW_DOMAIN` | `domain/` に新規ファイルが作成される | ドメイン変更は設計レビューが必要 | `newDomainFile` |
| `API_CONTRACT` | `*port.ts` / `*adapter.ts` が変更される | インターフェース契約は慎重な検証が必要 | `apiContractChange` |

ISSUE-006 Story A（v0.63.0）でこれらの判定が `phasegate.config.json` の `quickMode.fullModeRequiredWhen` から駆動されるようになった。フラグを `false` にすると、その特定のエスカレーションだけを無効化できる。Story B（v0.64.0）でさらに同じ判定が pre-tool-use hook に統合され、後追いのバリデーション時ではなく書き込み時点で同期的にエスカレートが発火するようになった。

任意のファイル群に対して dry-run したい場合は `npx phasegate check-change-category --paths <csv> [--format json] [--fail-on-full-required]` を使う。CI で「Quick Mode で出されたが本来 Full Mode 必須」の PR を hard fail させたい場合に有用。

### バリデータ緩和

Quick Mode が承認されると以下のように緩和:

| レイヤー | Quick Mode での扱い |
|---|---|
| L1 | **常に維持**（緩和なし） |
| L2 | `maintainedLayers` 設定に従い一部維持 |
| L3 | セキュリティバリデータのみ維持 |
| L4 | **全スキップ** |

ゲート緩和:
- `phase-gate`: Phase Gate チェックをスキップ
- `2-phase-execution`: 2-Phase Execution をスキップ

---

## 回帰テスト (K1-K15)

phasegate の非交渉要件が継続的に満たされているかを検証するセルフテストです。

### 実行方法

```bash
npx phasegate regression:run-k-requirements    # 16 テスト
npx phasegate regression:run-gng-gate           # 3 テスト
npx phasegate regression:run-k14-k15            # 2 テスト
npx phasegate regression:run-agent-guard        # 3 テスト
```

JSON 出力: `--format json`

### 非交渉要件 (K1-K15) 一覧

| # | 要件 | 対象 Unit |
|---|---|---|
| K1 | 5 層防御モデル（L0-L4） | validator-system |
| K2 | Phase Gate（設計→実装の順序強制） | phase-dependency-model |
| K3 | Biome AST 解析（import グラフ + 循環依存検出） | biome-ast-engine |
| K3.5 | @unit/@layer/@US-XXX メタデータ | traceability-model |
| K4 | テスト品質ルール（AAA / actual / no-domain-mock 等） | validator-system |
| K5 | DDD 設計スキル群 | validator-system |
| K6 | 2-Phase Execution（AI 安全メカニズム） | harness-api |
| K7 | Document Split（inception/product 分離） | harness-api |
| K8 | Cascade Updater | harness-api |
| K9 | Agent-Lesson System | ci-governance |
| K10 | Security/Performance 検出 | harness-api |
| K11 | Drift Detection（双方向） | validator-system |
| K12 | Consistency Checker | validator-system |
| K13 | phasegate.config.json（品質設定 SSOT） | config-foundation |
| K14 | Phase Dependency Model（3 層フェーズ構造） | phase-dependency-model |
| K15 | Plan 文書の必須生成 | harness-api |

### Go/No-Go Gate テスト

| ID | テスト内容 | 対象 |
|---|---|---|
| GNG-4 | YOLO/skip-permissions フラグが使用されないこと | harness-api |
| GNG-5 | 2 フェーズ実行が実施されていること | harness-api |
| GNG-8 | デフォルトオフ機能が守られていること | harness-api |

### エージェント非依存性ガード

ドメインサービスが `@anthropic-ai/claude-code` を import していないことを検証します。

- 対象: regression-runner.ts, migration-analyzer.ts, import-guard-service.ts
- 例外: `infrastructure/adapters/` パスは許可

---

## テストインフラストラクチャ

### テスト実行

```bash
pnpm test
```

内部的に 2 つの vitest 設定を順次実行:

```bash
vitest run --config scripts/harness/__tests__/vitest.config.forks.ts  # 先に実行
vitest run --config scripts/harness/__tests__/vitest.config.ts         # 後に実行
```

### vitest.config.ts（メイン）

| 設定 | 値 |
|---|---|
| pool | threads（singleThread: true） |
| timeout | 15000ms |
| fileParallelism | false |
| includes | `**/*.test.ts` |
| excludes | fixtures/、process.chdir 依存テスト |

### vitest.config.forks.ts（プロセス分離）

`process.chdir()` を使用するテスト専用。forks プールで実行:

- `integration/agent-integration/phase-gate-query-adapter-custom.integration.test.ts`
- `integration/config-foundation/file-system-config-repository.test.ts`
- `integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts`

### テスト構造

```
scripts/harness/__tests__/
├── unit/                    # ユニットテスト（Unit 別）
│   ├── adr-foundation/
│   ├── agent-integration/
│   ├── biome-ast-engine/
│   ├── ci-governance/
│   ├── config-foundation/
│   ├── harness-api/
│   ├── harness-error/
│   ├── nyquist-validation/
│   ├── phase-dependency-model/
│   ├── phase2-extensions/
│   ├── quick-mode/
│   ├── regression-suite/
│   ├── skill-quality/
│   ├── traceability-model/
│   └── validator-system/
├── integration/             # 統合テスト
├── e2e/                     # E2E テスト
├── fixtures/                # テストフィクスチャ
└── helpers/                 # テストヘルパー
```

### テスト統計（v0.33.0 時点）

- テストファイル: 399 件
- テストケース: 2,997 件
- 全件 PASSING

---

## Feature Flags 実装状態

`npx phasegate enable-feature <name>` / `disable-feature <name>` で切替可能。

| フラグ | デフォルト | ランタイム実装 | 説明 |
|---|---|---|---|
| `agentLessonCollection` | `false` | **Config のみ** | Lesson 収集の有効化（スキル実行時に手動チェックが必要） |
| `cascadeUpdate` | `false` | **接続済み** | storyReflection ゲートと product docs 累積更新を有効化 |
| `bundleSizeLimit` | `0`（無効） | **未実装** | バンドルサイズ上限（CI で強制する設計だが未接続） |
| `deadCodeGC` | `false` | **未実装** | デッドコード GC スキャン（CLI 手動実行のみ） |

> **Config のみ**: 設定値は保存されるがランタイムで参照するコードパスが未実装。
> **接続済み**: 設定変更が実際の動作に影響する。

---

## CI/CD

### GitHub Actions ワークフロー

`.github/workflows/ci.yml`:

| ジョブ | 環境 | 内容 |
|---|---|---|
| `test` | ubuntu-latest, Node 18/20/22 マトリクス | `pnpm test` |
| `pack` | ubuntu-latest, Node 22 | `pnpm pack` + パッケージサイズ < 5MB 検証 |

トリガー: `push` to main, `pull_request` to main

### CI テンプレート生成

ユーザープロジェクト向けの CI テンプレートを生成:

```bash
npx phasegate ci:generate-template --type <type> [--preset <id>] [--render] [--json]
```

| `--type` 値 | トリガー条件 | 用途 |
|---|---|---|
| `aidlc-gate` | pull_request | PR 時の品質ゲート |
| `consistency-check` | schedule | 定期的な一貫性チェック |
| `pre-commit` | pre-commit | コミット前検証 |

### 反復エラー監視

`ErrorRepetition` アグリゲートが同一エラーの発生回数を追跡:

- 閾値（デフォルト 3 回）を超えるとエスカレーション
- `error-history.json` に永続化
- `ci:check-repetition --code <code>` で確認
- `ci:check-repetition --reset` でリセット

---

## 開発中・計画中の機能

### Configurable Phase Gate（Phase A: 実装中 / Phase B: 計画中）

**計画文書**: `docs/inception/_shared/configurable_phase_gate_plan.md`

Phase A（v1.0 目標）:
- [x] プリセット拡張（full / standard / minimal / custom）
- [x] storyReflection ゲート検証
- [x] `@unit` マルチ Unit サポート設計
- [ ] Phase B 実装（カスタムゲート DSL）
- [ ] プリセット別ドキュメント整備

Phase B（v1.1 目標）:
- JSON ベースの `gates[]` 配列によるユーザー定義フェーズ依存
- DAG 検証（循環依存検出）

関連 TDD 計画:
- `configurable_phase_gate_b2_tdd_plan.md` 〜 `b5_tdd_plan.md`
- `configurable_phase_gate_b4_5_wiring_fix_plan.md`（統合修正）

### Skill Separation（計画中）

**計画文書**: `docs/inception/_shared/skill_separation_plan.md`

28 スキルを 3 層に分離する提案:

| 層 | スキル数 | 内容 |
|---|---|---|
| Core Skills | 8 | consistency-checker, cascade-updater, pointer-validator 等 |
| AIDLC Workflow Skills | 18 | Foundation(4), Design(5), Test Engineering(7), Implementation(2) |
| Utility Skills | 2 | skill-creator, codex-delegator |

init コマンド拡張: `npx phasegate init --skills core|aidlc|all`

### Harness→Phasegate リネーム（計画中・破壊的変更）

**計画文書**: `docs/inception/_shared/harness_to_phasegate_rename_plan.md`

コードベース全体で "harness" と "phasegate" の名称が混在している問題を解消:

| フェーズ | 内容 | 影響範囲 |
|---|---|---|
| Phase 0 | npm scripts 修正 | 完了済み |
| Phase 1 | `scripts/harness/` → `scripts/phasegate/` | 17 ディレクトリ |
| Phase 2 | Unit ディレクトリ名変更 | `harness-api/` → `phasegate-api/` 等 |
| Phase 3 | クラス/インターフェース/変数名 | 1,500+ TypeScript 参照 |
| Phase 4 | 設定キー・文字列リテラル | 15 設定ファイル |
| Phase 5 | ドキュメント・スキル参照 | 3,000+ Markdown 参照 |

### OSS 公開戦略（計画中）

**計画文書**: `docs/inception/_shared/oss_public_release_strategy.md`, `oss_release_tasklist.md`

公開に向けた準備タスクが文書化されています。

### v0 テスト移行（部分実装）

v0-migration スイートは UseCase が存在するが、スイート定義はプレースホルダー状態:
- `AnalyzeV0MigrationUseCase`: 分析（dry-run 対応）
- `MigrateV0TestsUseCase`: 移行実行（`--confirm` 必須）
- 実際のテストマッピングは未実装

---

## 既知の課題

### ISSUE-003: Lint 残存 Violation（145 件）

**起票日**: 2026-04-06 | **優先度**: Low | **影響**: 機能影響なし

v0.31.0 で 1,241 件から 145 件に削減済み。残存内訳:

| ルール | 件数 | 内容 |
|---|---|---|
| L1-003 (no-layer-violation) | 55 | レイヤー境界違反 |
| L1-007 (no-ghost-file) | 43 | 未使用ファイル |
| L1-006 (no-code-duplication) | 31 | コード重複 |
| L1-004 (enforce-folder-structure) | 12 | @layer 宣言不一致 |
| L1-005 (no-any-abuse) | 4 | 過度な `any` 型使用 |

確認: `npx phasegate lint --json`

### L0 / L4 の実効性

| レイヤー | 状態 | 理由 |
|---|---|---|
| L0 (FUSE) | **無効** | プラットフォーム依存（macOS/Linux ネイティブ） |
| L4 (Scheduled) | **手動のみ** | 自動スケジューリング未実装（CI cron で代替可能） |

### Nyquist Validation の自動生成パイプライン

`requirement-test-matrix.json` の自動生成ロジックが未実装。手動セットアップが必要。

### Capability Assessment の指摘事項

**文書**: `docs/inception/_shared/harness_capability_assessment.md`

AI エージェント使用時に git commit が settings.json で拒否されているため、pre-commit hooks（L2）が到達不能。
現在の対策: pre-tool-use hooks で L2 相当の検証を代替実施。

---

## ディレクトリ構造

### 内部構造

```
phasegate/
├── bin/phasegate                    # CLI エントリポイント (シェルスクリプト)
├── scripts/harness/
│   ├── main.ts                      # CLI ルーター (41+ コマンド)
│   ├── shared-kernel/               # Unit 横断の値オブジェクト
│   ├── setup/                       # スキルデプロイヤー
│   ├── integrations/                # pre-commit 統合
│   ├── templates/                   # GitHub/Husky CI テンプレート
│   ├── config-foundation/           # 設定解析・スキーマ
│   ├── harness-error/               # エラー定義・ADR 参照
│   ├── traceability-model/          # メタデータ管理
│   ├── phase-dependency-model/      # フェーズ依存関係・Phase Gate
│   ├── adr-foundation/              # ADR 管理
│   ├── biome-ast-engine/            # Biome AST 解析
│   ├── validator-system/            # L0-L4 バリデータ
│   ├── nyquist-validation/          # 要件-テストトレーサビリティ
│   ├── harness-api/                 # CLI コマンド層
│   ├── quick-mode/                  # Quick Mode
│   ├── agent-integration/           # Claude Code Hooks
│   ├── skill-quality/               # TDD・カバレッジ・Cascade
│   ├── ci-governance/               # CI テンプレート・反復監視
│   ├── regression-suite/            # K1-K15 回帰テスト
│   ├── phase2-extensions/           # v2 拡張
│   └── __tests__/                   # テストスイート
├── .claude/
│   ├── settings.json                # Claude Code hooks 設定
│   └── scripts/                     # シェルスクリプトフック
├── skills/                          # 28 スキル
├── templates/                       # 設定テンプレート
└── docs/
    ├── ADR/                         # Architecture Decision Records (13 件)
    ├── principles/                  # 開発原則・テスト規約 (immutable)
    ├── inception/                   # 設計文書・計画
    │   ├── _shared/                 # 横断的計画
    │   ├── _operation/              # 運用・デプロイ計画
    │   ├── issues/                  # 横断的 issue (ISSUE-001〜003)
    │   └── {Unit名}/               # Unit 毎の計画
    └── product/                     # 確定済み設計文書
```

### inception/_shared/ の主要計画文書

| ファイル | 内容 | 状態 |
|---|---|---|
| `configurable_phase_gate_plan.md` | Configurable Phase Gate 全体計画 | 実装中 |
| `skill_separation_plan.md` | スキル 3 層分離計画 | 計画中 |
| `harness_to_phasegate_rename_plan.md` | 名称統一リネーム計画 | 計画中 |
| `oss_public_release_strategy.md` | OSS 公開戦略 | 計画中 |
| `harness_capability_assessment.md` | 防御モデル実効性評価 | 完了（知見文書） |
| `known_issues.md` | 既知の問題一覧 | 継続更新 |
| `cross_cutting_decisions.md` | 横断的設計方針 | 確定 |

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
# 1. package.json の version を更新（CHANGELOG.md にもエントリを追記）
# 2. コミット・タグ
git add package.json CHANGELOG.md
git commit -m "fix: vX.Y.Z — 変更内容"
git tag vX.Y.Z
git push origin main --tags

# 3. npm 認証確認（未ログインなら npm login --auth-type=web）
npm whoami

# 4. dry-run で内容確認
npm publish --dry-run

# 5. 本 publish
npm publish --auth-type=web
```

#### npm publish で認証に詰まったときの対処

npm アカウントの 2FA 設定によって `npm publish` は挙動が変わる。

| 2FA モード | publish 時の挙動 | 対処 |
|---|---|---|
| 無効 | そのまま通る | `npm publish` のみで OK |
| TOTP（authenticator アプリ） | `EOTP` エラー → OTP 要求 | `npm publish --otp=<6桁>` |
| メール OTP（Enhanced Login Verification） | `EOTP` エラー → メールにコード送信 | 受信箱を確認し `--otp=<6桁>` |
| セキュリティキー / Passkey（FIDO/WebAuthn） | `EOTP` エラー（`--otp` フラグは TOTP 専用なので不可） | **`npm publish --auth-type=web`** を使う。ブラウザが開き鍵認証で承認すると publish が通る |

**セキュリティキー運用の場合の鉄則:** publish は必ず `--auth-type=web` を付ける。`--otp` は TOTP 専用なので使ってもブロックされる。

**CI 等で自動化したい場合:** npmjs.com の [Access Tokens](https://www.npmjs.com/settings/<username>/tokens) で **Granular Access Token** を発行（scope: 対象パッケージ / 権限: Read and write / Bypass 2FA: オン）し、`//registry.npmjs.org/:_authToken=<TOKEN>` を `.npmrc` か `NPM_TOKEN` 環境変数で注入する。

#### v0.32.0 → v0.39.0 のギャップに注意

`npm view phasegate version` が公開最新を返す。ローカルの `package.json` と ghost 的に乖離しているケースがあるため、publish 前に `npm view phasegate version` / `git tag --list | tail -5` / `package.json` の3者を照合すること。

---

## ロードマップ

| バージョン | 内容 | 状態 |
|---|---|---|
| **v0.33.0** (現在) | README 大改修・DEVELOPMENT ドキュメント新設 | リリース済み |
| **v1.0.0** | Configurable Phase Gate Phase A 完了・プリセット体系確立 | 実装中 |
| **v1.1.0** | Phase B（カスタムゲート DSL）・Skill Separation | 計画中 |
| **v1.2.0+** | Harness→Phasegate リネーム（破壊的変更） | 計画中 |
| **v2.0.0** | L0 FUSE 統合・L4 自動スケジューリング・OSS 公開 | 長期計画 |

---

*See also: [README.ja.md](README.ja.md) (ユーザーガイド) / [DEVELOPMENT.md](DEVELOPMENT.md) (English) / [README.md](README.md) (English user guide)*
