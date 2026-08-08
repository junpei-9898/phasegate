---
id: WI-153
type: issue
severity: high
status: drafted
affects: [skills, setup, agent-integration, documentation]
source: internal
---

# WI-153: Bundled Setup Guidance Skills Refresh

> 起票日: 2026-05-12
> 起票経緯: `/phasegate-config-doctor` と `/phasegate-toolkit-guide` を現行 setup lifecycle に追従させるため。

## スコープ

- `skills/phasegate-config-doctor/SKILL.md`
- `skills/phasegate-toolkit-guide/SKILL.md`
- 必要なら `skills/README.md`

## 主要変更

- config-doctor は `phasegate doctor` report, `.phasegate/manifest.json`, `.phasegate/last-doctor-report.json`, `.claude/settings.json`, `.codex/hooks.json`, `.husky/*`, `.github/workflows/*` を読む。
- config-doctor の「init 再実行」中心の助言を `install` / `reconcile` / `doctor` / `lint` 中心に改める。
- config-doctor は `repairMode`, `repairHint`, `suggestedSkill`, manifest hash mismatch, reconcile / uninstall refuse を入力として扱う。
- toolkit-guide は install lifecycle を独立カテゴリ化する。
- 両 skill の境界を「read-only docs 案内」と「doctor finding に基づく修復方針」に分ける。
- 両 skill は `p2:check-initial-creation`, `validate.failOnWarning`, `agentIntegration.stopHook.enforce`, Codex `apply_patch` bypass と pre-commit backstop を setup 診断観点に含める。

## 受け入れ基準

- [x] doctor が `suggestedSkill=phasegate-config-doctor` を出したとき、skill 側が実際にその相談を処理できる。
- [x] Codex hook feature flag と pre-commit backstop が setup 診断対象に入る。
- [x] 検証コマンドが L2 固定ではなく、変更内容ごとに `doctor`, `lint`, `phasegate:check-ready` などへ分岐する。

## 反映

- `skills/phasegate-config-doctor/SKILL.md`
- `skills/phasegate-toolkit-guide/SKILL.md`
- `docs/product/construction/installation/domain_model.md`

## 依存

`WI-152` の inventory と同時進行可能。ただし用語は合わせる。
