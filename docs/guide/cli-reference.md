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

## Work Item Migration

`docs/inception/` 配下の work item directory を **統一 `WI-XXX` レイアウト**へ移行する CLI。
WI-026 で導入（v0.100.0、`ISSUE-XXX` 系統）、WI-027 で `H{NN}-{NN}` 形式の旧ストーリー
directory にも拡張（v0.105.0）、WI-027 follow-up で apply の冪等性を確立（v0.107.0）。

> **WI taxonomy の正式仕様**は [`docs/folder_management_rules.md`](../folder_management_rules.md) を参照してください。本セクションは CLI の挙動に焦点を絞ります。

### いつ使うか

- **既存リポジトリ**: `docs/inception/issues/` や `{unit}/{US-XXX}/` のような旧形式を残しているプロジェクトを v0.105.0 以降へ更新する初回マイグレーション
- **新規開発で旧 ID を持ち込む**: 別リポジトリから `ISSUE-XXX` / `H{NN}-{NN}` directory をコピーした後、`legacy_id` を保ったまま `WI-XXX` に統一したいとき
- **継続運用での再走査**: 既存 WI と新規 directory の混在状態に対し、未採番のものだけ採番する（既存 WI は idempotent skip）

新規 PJ で最初から `WI-XXX` で起票している場合は不要です。

| Command | Options | Description |
|---|---|---|
| `migrate work-items` | `--dry-run` / `--apply` / `--json` | 旧 directory を `WI-XXX` へ採番移行する。`--dry-run` と `--apply` は排他、どちらかが必須。|

### 検出パターン

`docs/inception/` 配下を走査し、以下のいずれかに合致する directory を candidate として列挙する:

| 検出パターン | 配置 | scope | nextId 採番方式 |
|---|---|---|---|
| `^ISSUE-\d+$` | `docs/inception/issues/` または `{unit}/issues/` | `cross` / `unit` | embedded number そのまま (`ISSUE-026 → WI-026`) |
| `^WI-\d+$` | 既に WI レイアウトの directory | `cross` / `unit` | 変更なし（idempotent skip） |
| `^H\d{2}-\d{2}$` | `{unit}/` 直下 | `unit` のみ | sequential allocator: 既存 WI 番号 + 同一 plan 内 ISSUE-XXX 番号を予約したうえで、空き番号の若い順に `WI-XXX` を割り当て |

skip 対象: `_shared/` / `_operation/` / `_cross/` / `issues/` 配下（`_cross/WI-XXX/` は WI レイアウトのため再走査不要）。

### Sequential Allocator の挙動（H-ID 採番）

```
input:  entries (混在: WI-XXX / ISSUE-XXX / H{NN}-{NN})
        existingWorkItemIds = ["WI-001", ..., "WI-027"]   # _cross/ + {unit}/ から列挙

step 1. usedNumbers = parseToInts(existingWorkItemIds)            # {1..27}
step 2. 同一 plan 内 ISSUE-XXX / WI-XXX の embedded number を usedNumbers に追加
step 3. H-ID entries を sourcePath 昇順でループ:
          cursor = 1
          while usedNumbers.has(cursor): cursor++
          assign WI-{cursor.padStart(3, "0")} to entry
          usedNumbers.add(cursor)
```

不変条件:

- 既存 WI-XXX directory の番号は新規 H-ID 採番で再利用されない。
- 同一 plan 呼び出し内で `nextId` は重複しない（usedNumbers が共有される）。
- `ISSUE-XXX → WI-XXX` の embedded mapping は変更しない（後方互換）。

### Frontmatter 注入

`--apply` 時、各 directory の `description.md` に以下の frontmatter を生成する。
既存 frontmatter があれば **id 一致 + legacy_id 一致** のときだけ byte-for-byte
保持し、それ以外は planner 生成版で置換する（v0.107.0 で冪等化）。

```yaml
---
id: WI-XXX                    # 採番された ID
type: story | issue           # H-ID 由来は story、ISSUE-XXX 由来は issue
severity: trivial | normal | high  # 元 description の "深刻度" から抽出（既定: normal）
status: drafted
legacy_id: H02-04              # または ISSUE-026
affects: [unit-a, unit-b]      # cross scope のみ。元 description の "影響Unit" から抽出
---
```

`description.md` 不在の directory には `# {legacyId}\n` の stub を生成して frontmatter を prepend する。

### 使用例

```bash
# 移行候補を表示（実際の rename は行わない）
npx phasegate migrate work-items --dry-run

# JSON 出力（CI / スクリプト向け）
npx phasegate migrate work-items --dry-run --json

# 実マイグレーション実行
npx phasegate migrate work-items --apply

# apply 結果を JSON で取得
npx phasegate migrate work-items --apply --json
```

### exit code

| code | 意味 |
|---|---|
| `0` | 成功（dry-run 時 conflict なし、apply 時 blocked なし）|
| `1` | dry-run で conflict candidate あり（target directory が既に存在）/ apply で blocked |
| `2` | 引数不正（`--dry-run` / `--apply` どちらも未指定、両方指定、`--apply` 未配線等）|

### Legacy ID Grep 互換性

WI-XXX へ移行後も、frontmatter の `legacy_id:` 経由で旧 ID を逆引きできる:

```bash
# 旧 H-ID から WI directory を逆引き
grep -rn "^legacy_id: H02-04" docs/inception/

# 旧 ISSUE-XXX から逆引き
grep -rn "^legacy_id: ISSUE-026" docs/inception/

# Work-Item commit trailer による履歴遡及
git log --grep='Work-Item: WI-074'
```

また、ソースコード内の `// @story-id H02-04` などの legacy annotation は、
`FileSystemStoryReflectionAdapter#readLegacyId` が `_cross/` と `{unit}/` の
両方の `WI-XXX/description.md` を走査して `legacy_id` を解決するため、
unit-scoped WI（H-ID 由来）の reflection check でも継続認識される（v0.105.0）。

---

## Harness API

Commands exposed as npm scripts (`npm run <command>`).

| Command | Options | Description |
|---|---|---|
| `phasegate:status` | `--json` | Health summary |
| `phasegate:check-ready` | `--json` | Phase Gate pass status for all stories |
| `phasegate:check-phase` | `--unit <unitId>` `--json` | Current phase for a unit |
| `phasegate:ci-check` | `--json` | Full CI check (L2-L4; disabled L4 is reported as skipped) |
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
| `ci:generate-template` | `--preset <id>`（省略時 `standard`） `--type <type>` `--render` `--json` | Generate CI/CD template |
| `ci:migrate-agents-md` | `--dry-run` `--validate-only` `--json` | Migrate AGENTS.md to pointer format |
| `ci:auto-refresh-agent-context` | `--dry-run` `--apply` `--json` | Refresh AGENTS.md pointers and CLAUDE.md standard sections |
| `refresh-claude-md` | `--dry-run` `--apply` `--json` | Refresh CLAUDE.md while preserving the user-owned section |
| `p2:check-agent-context` | `--threshold-days <n>` `--json` | Check AGENTS.md / CLAUDE.md freshness |
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
