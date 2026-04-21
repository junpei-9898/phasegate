# Phasegate CLI Reference

Entry point:

```
npx phasegate <command> [options]
```

---

## Setup

| Command | Description |
|---|---|
| `init --name <name>` | Deploy skills and generate `phasegate.config.json` |
| `update-skills` | Re-deploy skills to the latest version |
| `list-features` | List available features |
| `enable-feature <name>` | Enable a feature |
| `disable-feature <name>` | Disable a feature |

---

## Quality Checks

| Command | Options | Description |
|---|---|---|
| `lint` | `--target <path>` `--json` | L1 Biome AST check |
| `validate` | `--layer L1\|L2\|L3\|L4\|all` `--unit <name>` `--format human\|agent\|ci` | L2-L4 validators |
| `ci-check` | `--quick` `--fail-on-reject` `--dry-run` `--files` | Full CI check (L2-L4) |
| `validate-metadata <files>` | | Validate implementation metadata |
| `check-phase-gate` | `--level 1\|2\|3` | Phase gate check |

---

## Quick Mode

| Command | Options | Description |
|---|---|---|
| `check-change-category` | `--paths <csv>` `--format human\|json` `--fail-on-full-required` | Classify changed file paths into Quick Mode categories (`api` / `domain` / `feature` / `bugfix` / `test` / `config` / `docs`) and report whether `quickMode.fullModeRequiredWhen` forces escalation to Full Mode. |

### `check-change-category` の使い方

ISSUE-006 Story A で導入。Quick Mode で取り扱おうとしている変更が
`quickMode.fullModeRequiredWhen` のいずれかをトリガーするか事前に確認したいときに使う。

```bash
# JSON 出力 (CI で消費しやすい)
npx phasegate check-change-category --paths src/foo.ts,src/bar.ts --format json

# Full Mode が必要なら exit 1 (PR チェック等に使える)
npx phasegate check-change-category \
  --paths "$(git diff --name-only origin/main...HEAD | paste -sd, -)" \
  --fail-on-full-required
```

`--fail-on-full-required` を指定しない場合、Full Mode が必要と判定されても exit 0 を返す
（情報提供のみ）。CI で gate にしたいときは必ず付与すること。

---

## Baseline (Retrofit Grandfather)

| Command | Options | Description |
|---|---|---|
| `baseline` | `--dry-run` `--force` `--paths <glob,glob,...>` `--json` | Create / refresh `.phasegate/baseline.json` snapshot. Files in the snapshot are exempted from `phase-gate` until they are structurally modified (sha1 mismatch). |

### `baseline` の使い方

ISSUE-007 Wave 1 で導入。既存リポジトリに phasegate を後付けする際、現状のコード資産を
"Phase A-2 grandfather" として一度だけ凍結する。

```bash
# 現在のリポジトリ全体をスナップショット
npx phasegate baseline

# 何が含まれるかだけ確認 (ファイルは書かない)
npx phasegate baseline --dry-run --json

# 既存スナップショットを上書きして再生成
npx phasegate baseline --force

# 特定ディレクトリだけ含める
npx phasegate baseline --paths "scripts/harness/**/*.ts,src/**/*.ts"
```

スナップショットに含まれるファイルは sha1 ハッシュで照合される。ファイルを構造的に
編集した瞬間に grandfather が外れ、通常の `phase-gate` 対象に戻る。新規ファイルは
最初から `phase-gate` の対象。

`baseline.enabled` は v0.71.0 以降 default が `true`（ISSUE-007 Wave 6）。
オフにしたい場合のみ `phasegate.config.json` に `baseline.enabled: false` を明示。
スナップショットの保存先は `baseline.path` で変更可能。

`baseline --dry-run --json` の出力キーは v0.71.0 で保存ファイルと整合する `files`
に統一（旧 `entries` は廃止）。

---

## Scaffold Design (Retrofit Template Generator)

| Command | Options | Description |
|---|---|---|
| `scaffold-design` | `--unit <id>` `--phase <logical\|domain\|uiux\|unit-test\|it-test>` `--force` `--json` | `templates/*.template.md` を読み取り `{{unit}}` を `--unit` 値で置換して `docs/product/construction/{unit}/*.md` を生成する。既存ファイルは `--force` なしでは保護（exit 2）。|

### `scaffold-design` の使い方

ISSUE-007 Wave 4 で導入（v0.69.0）。phase-gate が発火した際にエラーメッセージへ
挿入される `scaffold: npx phasegate scaffold-design ...` 行の実体。AIDLC フル
スキルを起動せずに設計文書の雛形だけ先に置きたい時に使う。

```bash
# 論理設計テンプレを harness-api 用に生成
npx phasegate scaffold-design --unit harness-api --phase logical

# 既存ファイルを意図的に上書き
npx phasegate scaffold-design --unit harness-api --phase logical --force

# CI / スクリプト向け JSON 出力
npx phasegate scaffold-design --unit harness-api --phase logical --json
```

生成先と対応テンプレ:

| `--phase` | 生成先 | テンプレ |
|---|---|---|
| `logical` | `docs/product/construction/{unit}/logical_design.md` | `templates/logical_design.template.md` |
| `domain` | `docs/product/construction/{unit}/domain_model.md` | `templates/domain_model.template.md` |
| `uiux` | `docs/product/construction/{unit}/uiux_design.md` | `templates/uiux_design.template.md` |
| `unit-test` | `docs/product/construction/{unit}/unit_test_design.md` | `templates/unit_test_design.template.md` |
| `it-test` | `docs/product/construction/{unit}/it_test_design.md` | `templates/it_test_design.template.md` |

exit code は `0` = 生成成功 / 上書き成功、`2` = 既存ファイルあり（`--force` 無）
または引数不正。

---

## Harness API

Commands exposed as npm scripts (`npm run <command>`).

| Command | Options | Description |
|---|---|---|
| `phasegate:status` | `--json` | Health summary |
| `phasegate:check-ready` | `--json` | Phase Gate pass status for all stories |
| `phasegate:check-phase` | `--unit <unitId>` `--json` | Current phase for a unit |
| `phasegate:ci-check` | `--json` | All L3 validators |
| `phasegate:detect-drift` | `--json` | Design-code drift report |
| `phasegate:lint` | `--target <path>` `--json` | Lint via harness-api |
| `phasegate:complete-check` | `--json` | L2-L4 full check |
| `phasegate:impact-analysis` | `<storyId>` `--json` | Story impact analysis |

---

## ADR Management

| Command | Options | Description |
|---|---|---|
| `list-adrs` | `--status Proposed\|Accepted\|Deprecated\|Superseded` | List ADRs |
| `validate-adr` | `--all` or `<adrRef>` | Validate ADR |

---

## HarnessError

| Command | Options | Description |
|---|---|---|
| `list-errors` | `--format human\|json` `--layer L0-L4` | List error definitions |
| `render-errors` | `--format human\|agent\|ci` | Render errors |
| `validate-fix` | `--code <code>` | Validate fix code example |

### `list-errors` と `render-errors` の使い分け

ISSUE-005 P3-10 で明確化された境界:

- **`list-errors`** — **定義駆動**。`HarnessError` Value Object の**静的な定義**を出力する。
  コードを実行しないため、常に安定した結果を返す。`--format json` と組み合わせて**異なる
  バージョン間の定義差分を比較**する用途に向く。
- **`render-errors`** — **ランタイム駆動**。実行時に蓄積されたエラーの**蓄積履歴**を整形する。
  まだエラーが記録されていない環境では空を返すため、テストデータや実行痕跡を前提とする。
  CI ログ向けの詳細フォーマット (`--format ci`) やエージェント送信向けの構造化 (`--format agent`)
  に向く。

**差分比較を行いたい場合は `list-errors --format json`** を使い、`render-errors` は runtime 観測用と
位置付けること。

---

## Skill Quality

| Command | Options | Description |
|---|---|---|
| `skill:execute-tdd-cycle` | `--unit` `--story` `--desc` `--phase RED\|GREEN\|REFACTOR` `--passed` | Run TDD cycle |
| `skill:check-coverage` | `--story <storyId>` `--json` | Coverage check |
| `skill:collect-lessons` | `--story <storyId>` `--sources <paths>` `--write-artifact` | Collect agent lessons |
| `skill:apply-cascade-update` | `--story <storyId>` `--dry-run` | Cascade update to upstream docs |
| `skill:validate-structure` | `--file <path>` `--json` | Validate skill structure |

---

## CI/CD

| Command | Options | Description |
|---|---|---|
| `ci:generate-template` | `--preset <id>` `--type <type>` `--render` `--json` | Generate CI/CD template |
| `ci:migrate-agents-md` | `--dry-run` `--validate-only` `--json` | Migrate AGENTS.md to pointer format |
| `ci:check-repetition` | `--code <errorCode>` `--reset` `--json` | Detect repetitive errors |

---

## Regression Tests

| Command | Description |
|---|---|
| `regression:run-k-requirements` | K1-K15 non-negotiable requirements |
| `regression:run-gng-gate` | Go/No-Go Gate 3 quality conditions |
| `regression:run-agent-guard` | Agent-independence guard |
| `regression:run-k14-k15` | K14/K15 regression |
| `regression:configure-ci-gate` | Configure CI gate |
| `regression:analyze-migration` | Analyze v0 test migration |
| `regression:migrate-v0-tests` | Execute v0 test migration |

---

## Hooks Engine

| Command | Options | Description |
|---|---|---|
| `hooks:config validate` | | Validate `.harness-hooks.yml` |
| `hooks:gate-check` | `--story <id>` | Completion gate check |

---

## Phase 2 Extensions

| Command | Options | Description |
|---|---|---|
| `p2:check-freshness` | `--pattern <glob>` `--dry-run` `--format text\|json` | Design doc freshness check |
| `p2:validate-pointers` | `--include-urls` `--format text\|json` | Validate file pointers in docs |
| `p2:generate-e2e-template` | `--phase <phase>` `--output <path>` | Generate E2E test template |
