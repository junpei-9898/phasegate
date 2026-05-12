---
id: WI-150
type: issue
severity: high
status: reflected
affects: [documentation, harness-api, ci-governance, regression-suite, skill-quality, setup]
source: internal
---

# WI-150: Public CLI Catalog Consolidation

> 起票日: 2026-05-12
> 起票経緯: CLI 表面の drift を、README / CLI reference / DEVELOPMENT.md の公開契約として整理するため。

## 背景

PhaseGate の CLI は npm scripts、binary subcommands、compatibility commands、internal maintenance commands が混在している。利用者が「どの名前で、どの導線から、何のために使うか」を誤解しないよう、公開 CLI catalog を統合する。

## スコープ

- `phasegate:ci-check` と `ci-check` 表記揺れ。
- `phasegate:check-ready`, `phasegate:detect-drift`, `phasegate:impact-analysis`
- `ci-check --quick --fail-on-reject --dry-run --files`
- regression-suite CLI / skill-quality CLI
- `init --skills`, `--yes`, subcommand `--help` / `-h`, unknown flag suggestion
- `phasegate:generate-matrix`, `emit-agent-rules`, `scaffold-wi`
- `p2:check-initial-creation`
- `hook session-start` / `hook user-prompt-submit`
- `validate --fail-on-warning` / `--no-fail-on-warning` / `--no-l4`
- setup lifecycle の `--json` variants (`install` / `reconcile` / `uninstall` / `doctor`)

## 主要成果物

- `README.md`
- `DEVELOPMENT.md`
- `docs/guide/cli-reference.md`

## 受け入れ基準

- [x] README は入口として主要コマンドと参照先を示し、全列挙は CLI reference に寄せる。
- [x] CLI reference は npm script 名、binary subcommand、help 表示のどれを指すかを混同しない。
- [x] `package.json` scripts に存在しない `phasegate:*` command を「npm script」と誤読させない。
- [x] `scripts/harness/main.ts` help に載る公開 command は、public docs に載せるか internal / compatibility 扱いとして理由を明確にする。
- [x] regression-suite / skill-quality / quick CI の使い道が、初見でも辿れる。

## 依存

`WI-149` の command naming 決定後に着手する。
