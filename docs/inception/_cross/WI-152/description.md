---
id: WI-152
type: story
severity: high
status: drafted
affects: [documentation]
source: internal
---

# WI-152: PhaseGate Setup Artifact Inventory Documentation

> 起票日: 2026-05-12
> 起票経緯: PhaseGate の「正しくセットアップされている状態」を、設定ファイル・hook・manifest・runtime state の棚卸しとして公開 docs に定義するため。

## スコープ

- `phasegate.config.json`, `package.json`
- `preCommit.implementationExtensions`, `validate.failOnWarning`, `agentIntegration.stopHook.enforce`
- `phaseDependencies.gates` / `phaseDependencies.storyReflection`
- `protectedFiles.exclude` と実装側 `protectedFiles.patterns`
- `baseline.enabled` / `baseline.path`
- `quickMode.fullModeRequiredWhen.*`
- `.claude/settings.json`, `.claude/settings.local.json`, `.claude/scripts/hook-config.json`
- `.codex/hooks.json`, user/project Codex config
- `.husky/*`, `.github/workflows/*`
- `.phasegate/manifest.json`, `.phasegate/baseline.json`, `.phasegate/hook-skip-events.jsonl`
- `.phasegate/backups/*`, `.phasegate/uninstalled-*.json`, `.phasegate/last-doctor-report.json`
- active `.harness/*` artifacts
- `AGENTS.md` / `CLAUDE.md`

## 主要成果物

- `docs/guide/installation.md`
- `docs/guide/hooks-integration.md`
- `docs/guide/configuration.md`
- `docs/guide/retrofit-adoption.md`
- 必要なら新規 `docs/guide/setup-artifacts.md`

## 受け入れ基準

- [x] `phasegate.config.json`, `.claude/settings.json`, `.codex/hooks.json` だけ見れば足りる、という誤解がなくなる。
- [x] managed target / generated artifact / runtime state / legacy artifact / user-level setting が明確に分かれる。
- [x] `.github/workflows/phasegate-aidlc-gate.yml` と `.github/workflows/aidlc-gate.yml` の命名差分を解消または説明する。
- [x] `reporting.outputDir`, `reports`, `.harness/reports`, `reports/regression` の関係を説明する。
- [x] `.phasegate/last-doctor-report.json` は固定生成ではなく `doctor --report-out` 指定時の任意出力であることを誤解なく説明する。

## 反映

- `docs/guide/setup-artifacts.md`
- `docs/guide/installation.md`
- `docs/guide/hooks-integration.md`
- `docs/guide/configuration.md`
- `docs/product/construction/setup/logical_design.md`

## 依存

`WI-145..148` の installation lifecycle 仕様。
