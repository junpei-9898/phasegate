# Phasegate CLI Reference

Entry point:

```
npx phasegate <command> [options]
```

<!-- @work-item-id WI-150 -->

Command names in this document are split into three surfaces:

| Surface | How to run | Contract |
|---|---|---|
| Binary subcommand | `npx phasegate <command>` | Public CLI shipped by the package. This includes `phasegate:*` compatibility subcommands shown by `phasegate --help`. |
| npm script | `npm run <script>` / `pnpm <script>` | Only available when the consuming project's `package.json` defines that script. The package itself currently defines `phasegate`, `phasegate:status`, `phasegate:enable`, `phasegate:disable`, `phasegate:check-phase`, `phasegate:check-ready`, and `harness:*` aliases. |
| Internal / compatibility | `npx phasegate <command>` | Supported for migration, dogfooding, or legacy workflows; prefer the canonical command listed in the description when one exists. |

---

## Setup

| Command | Description |
|---|---|
| `init --name <name>` | Legacy-compatible bootstrap for new projects: deploy skills, generate config, and optionally add hooks/CI. Options: `--preset <full\|standard\|minimal\|custom>`, `--skills <core\|all>`, `--agent <claude\|codex\|both>`, `--workflow <standard\|strict>`, `--with-husky`, `--with-ci`, `--yes`. |
| `install --dry-run` / `--apply` | Idempotently merge PhaseGate into an existing project, preserve user content, add package scripts/devDependency, create selected `AGENTS.md` / `CLAUDE.md` managed sections, and write `.phasegate/manifest.json`. `--agent <claude\|codex\|both>`, `--skills <core\|all>`, and `--workflow <standard\|strict>` affect rendered agent context; `--force` replaces managed targets after backup. |
| `doctor` | Diagnose silent or partial installations and report repair hints (`--json`, `--strict`, `--agent <claude\|codex\|both>`, `--report-out <path>`). `--agent` defaults to `both`; single-agent scopes keep shared targets applicable and mark the other agent's findings as not applicable. `--report-out` writes exactly to the supplied path, not to `reporting.outputDir`. |
| `uninstall --dry-run` / `--apply` | Remove PhaseGate-managed files and managed blocks using `.phasegate/manifest.json`; `--force` handles managed conflict cases. |
| `reconcile --dry-run` / `--apply` | Update PhaseGate-managed files to current package templates and refresh manifest hashes; `--force` allows managed-file replacement with backup. |
| `setup:agent` | Agent-readable setup planner and optional apply path. Options: `--intent <minimal\|recommended\|strict\|ci-only\|agent-hooks\|retrofit>`, `--agent <claude\|codex\|both>`, `--workflow <standard\|strict>`, `--with-husky`, `--with-ci`, `--dry-run`, `--apply`, `--json`. <!-- @work-item-id WI-172 --> |
| `config:plan` | Agent-readable configuration change planner. Options: `--intent <l4-strict\|codex-hooks\|ci-fail-on-warning\|baseline-reset\|quick-mode-strict\|quick-mode-relax\|retrofit-bootstrap\|planning-mode-relax>`, `--dry-run`, `--apply`, `--json`. <!-- @work-item-id WI-173 --> <!-- @work-item-id WI-201 --> <!-- @work-item-id WI-204 --> |
| `session begin` / `session end` | Hook-visible Full Mode session manager. Use `session begin --mode full --unit <unit> --work-item <WI-XXX> --reason <text> --duration <ttl>` before implementation that must touch Quick Mode disallowed categories, and `session end --work-item <WI-XXX>` after completion. <!-- @work-item-id WI-206 --> |
| `update-skills` | Compatibility alias for `reconcile`; use `reconcile` for new automation. |
| `scaffold-wi <unit> <type>` | Create `docs/inception/{unit}/WI-XXX/description.md` using the next free WI number. |
| `emit-agent-rules` | Print the AGENTS.md / CLAUDE.md WI workflow rules block. |
| `list-features` | List available features |
| `enable-feature <name>` | Enable a feature |
| `disable-feature <name>` | Disable a feature |

### Setup JSON and report outputs

<!-- @work-item-id WI-158 -->

Setup lifecycle commands support JSON for automation where shown by help: `install --json`, `reconcile --json`, `uninstall --json`, and `doctor --json`. `doctor --agent claude --json` and `doctor --agent codex --json` include `scope` and `scopedOutFindings` so agents can distinguish selected-agent readiness from full-install diagnostics. Scoped-out findings suppress immediate repair guidance with `repairHint: null`, `suggestedSkill: null`, `currentScopeRepairTarget: false`, `repairHintApplicability: "only-if-agent-selected"`, and `repairModeApplicability: "only-if-agent-selected"`; applicable `findings[]` use `currentScopeRepairTarget: true` with applicable repair fields. `doctor --report-out <path>` persists the doctor JSON payload to that exact path. Relative paths are resolved from the project root; absolute paths are used as-is. <!-- @work-item-id WI-178, WI-179, WI-180 -->

This is separate from `reporting.outputDir`. The configured report directory is used by phase-dependency / phase-gate reporting, while regression-suite result files are fixed under `reports/regression/` and status/drift JSON is emitted to stdout.

---

## Quality Checks

| Command | Options | Description |
|---|---|---|
| `lint` | `--target <path>` `--json` | L1 Biome AST check |
| `validate` | `--layer L0\|L1\|L2\|L3\|L4\|all` `--unit <name>` `--format human\|agent\|ci` `--fail-on-warning` `--no-fail-on-warning` `--no-l4` | Validators. `--layer L0` prints runtime hook guidance. Explicit `--layer L4` runs L4 on demand; `all` and CI-style execution honor disabled L4 unless overridden by command-specific behavior. |
| `ci-check` | `--quick` `--fail-on-reject` `--dry-run` `--files` | Full CI check (L2-L4). `--quick` applies Quick Mode relaxation policy, `--fail-on-reject` turns a rejected quick decision into a failing exit, `--dry-run` reports without enforcing, and `--files` supplies the changed-file set. |
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

<!-- @work-item-id WI-150 -->

The following are binary subcommands (`npx phasegate <command>`). Do not assume they are npm scripts unless the consuming project defines a matching `package.json` script. In this package, only `phasegate:status`, `phasegate:check-ready`, and `phasegate:check-phase` are currently exposed as package scripts among the `phasegate:*` commands.

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
| `phasegate:generate-matrix` | `--requirements <path>` `--tests <path>` `--out <path>` `--json` | Generate the requirement-test matrix |

### Status and drift JSON semantics

<!-- @work-item-id WI-151, WI-162 -->

`phasegate:status --json` is intended for humans, CI, and agents that need to distinguish configured intent from observed results. Layer entries may include:

| Key | Meaning | How to use it |
|---|---|---|
| `configurationState` | Whether the layer is enabled by resolved config (`enabled` / `disabled`) | Use this to explain why a layer should run or be skipped. |
| `cachedArtifactState` | Whether a previously generated artifact/report is present (`present` / `missing`) | Use this to decide whether a report needs to be generated before relying on cached evidence. `missing` means no artifact exists; it is not the same as a validator limitation. |
| `liveValidationState` | Result of the current live check (`pass` / `fail` / `skipped`) | Use this as the current gate signal. `skipped` usually follows disabled configuration. |

`phasegate:detect-drift --json` returns drift findings from live design/code comparison. A finding with a real mismatch is different from a validator `limitation`: `missing` means expected evidence or artifacts were absent, while `limitation` means the validator cannot currently prove the condition and should be treated as advisory until coverage is improved.

Status JSON may also include:

| Key | Meaning |
|---|---|
| `hookHealth` | Configured hook files, latest skipped hook event, skip counts by reason, and the Codex native `apply_patch` limitation with the pre-commit backstop. |
| `baselineHealth` | Baseline enabled state, baseline path, grandfathered file count, SHA mismatch count, missing file count, and removal rate. |
| `operationalWarnings` | Non-gating warnings with `code`, `message`, and `nextAction`. |

Drift JSON findings should preserve the most precise available `location`, `unit`, `category`, `severity`, and `nextAction`. Structural drift (`L4-001`) compares product design and code structure. Semantic drift compares `DesignIntent`, `ImplementationBehavior`, and `TestObservation` by `unitName + behaviorId`; it is an L4 report producer above structural drift and does not replace `L4-001`.

L4 warning findings fail the process only when warning strictness is enabled (`validate.failOnWarning: true`, the `strict` preset, or `--fail-on-warning`). `--no-fail-on-warning` forces advisory behavior for the current command.

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
| `ci:auto-refresh-agent-context` | `--dry-run` `--apply` `--json` | Refresh AGENTS.md lesson pointers in a dedicated section and CLAUDE.md standard sections without replacing user-owned agent instructions |
| `refresh-claude-md` | `--dry-run` `--apply` `--json` | Refresh CLAUDE.md while preserving the user-owned section |
| `p2:check-agent-context` | `--threshold-days <n>` `--json` | Check AGENTS.md / CLAUDE.md freshness |
| `ci:check-repetition` | `--code <errorCode>` `--reset` `--json` | Detect repetitive errors |

---

## Regression Tests

<!-- @work-item-id WI-150, WI-158 -->

| Command | Description |
|---|---|
| `regression:run-k-requirements` | K1-K15 non-negotiable requirements. Writes suite result JSON under fixed `reports/regression/`. |
| `regression:run-gng-gate` | Go/No-Go Gate 3 quality conditions. Writes suite result JSON under fixed `reports/regression/`. |
| `regression:run-agent-guard` | Agent-independence guard. Writes suite result JSON under fixed `reports/regression/`. |
| `regression:run-k14-k15` | K14/K15 regression. Writes suite result JSON under fixed `reports/regression/`. |
| `regression:configure-ci-gate` | Configure CI gate (`--suites <ids>`, `--threshold <n>`). |
| `regression:analyze-migration` | Analyze v0 test migration (`--dry-run`). |
| `regression:migrate-v0-tests` | Execute v0 test migration (`--confirm`). |

---

## Hooks Engine

| Command | Options | Description |
|---|---|---|
| `hooks:config validate` | | Compatibility validator for legacy `.harness-hooks.yml`; new setup should use `install`, `doctor`, `reconcile`, `lint`, and `validate` |
| `hooks:gate-check` | `--story <id>` | Completion gate check |

---

## Phase 2 Extensions

| Command | Options | Description |
|---|---|---|
| `p2:check-freshness` | `--pattern <glob>` `--dry-run` `--format text\|json` | Compatibility entry point for L4-004 doc freshness; canonical L4 execution is `validate --layer L4` |
| `p2:validate-pointers` | `--include-urls` `--format text\|json` | Compatibility entry point for L4-005 pointer validation; canonical L4 execution is `validate --layer L4` |
| `p2:generate-e2e-template` | `--phase <phase>` `--output <path>` | Generate E2E test template |
| `p2:check-initial-creation` | `--pattern <glob>` `--format text\|json` | Public compatibility detector for long-lived `initial_creation: true` docs; configured by `phase2Extensions.initialCreationExpirationRules`. |

### `phasegate:generate-matrix`

<!-- @work-item-id WI-125, WI-131 -->

Generates `.harness/requirement-test-matrix.json` from product acceptance criteria and test metadata.

```bash
phasegate phasegate:generate-matrix --requirements docs/product/user_stories.md --tests scripts/harness/__tests__ --out .harness/requirement-test-matrix.json
phasegate validate --layer L3
```

Use `--json` to inspect `missingTests`, `orphanTests`, preserved references, and intent coverage.
