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
