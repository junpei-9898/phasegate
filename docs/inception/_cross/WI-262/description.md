---
id: WI-262
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-262: README.md / README.ja.md を現行仕様（v0.211.0）に追随させる

> 起票日: 2026-07-15
> 起票経緯: 先行のギャップ分析により、README.md（英語）と README.ja.md（日本語）が現行仕様から乖離していることが確定した。スキルカタログは WI-256 で 30 → 29 に確定済み、HEAD は v0.211.0（instruction-file integrity pin 有効化済み）。README.md は部分更新、README.ja.md は v0.110.0 相当（2026-04-25、約 3 ヶ月遅れ）で全面追随が必要。ADR-030（インジェクション脅威モデルと信頼のルート）の 5 コンポーネント（integrity pin / attestation gate / spotlighting / advisory scanner / allowlist）と、新規バリデータ L2-016 / L3-006 のドキュメント反映が主眼。

## Acceptance Criteria

### README.md（英語・部分更新）
- [ ] 5-Layer Defense Model の L2 行に coverage-report attestation gate（L2-016, fail-closed, `ungated-legacy` マーカー）と story-reflection の layer-aware + file-tag scoped attribution を追記
- [ ] 同 L3 行に advisory injection scanner（L3-006, warning-only, instruction-carrying files 対象）を追記
- [ ] Security Posture 節を新設（ADR-030 の要点: 脅威モデルの同一性 / trust root は L3 CI 再計算 / L0-L2 は fast-path / 5 コンポーネント / 残存リスクの誠実な明記）
- [ ] CLI Reference 表に `integrity:pin` / `integrity:verify` / `list-adrs` / `validate-adr` を追加（drift で exit 2）
- [ ] Claude Code Hooks Integration 表に SessionStart（integrity drift 警告, warn-only）と UserPromptSubmit（spotlighting）を追記
- [ ] 残存する 30 表記（skills 一式 / core capabilities）を 29 に修正

### README.ja.md（日本語・全面追随）
- [ ] スキル数 30 → 29（全 6 箇所 + グループ表）: 削除 3 スキル（implementation-planner / doc-freshness-checker / pointer-validator）を除去、doc-health-checker=Verification / release-publisher=Operations を追加
- [ ] `codex features enable codex_hooks` → `codex features enable hooks`
- [ ] personal install の生成ファイル名を現行仕様に（`.claude/CLAUDE.md`、team AGENTS.md 不在時のみ `AGENTS.md`）
- [ ] 5-Layer L2/L3 と Security Posture 節（英語版の対訳）
- [ ] CLI 表へ `integrity:pin` / `integrity:verify` / `setup:agent` / `config:plan` / `scaffold-wi`、`hook` の引数に session-start / user-prompt-submit を追加
- [ ] Getting Started 導線を追加
- [ ] footer の版表記を `v0.211.0 (2026-07-15)` に更新

## 正確性の制約
- 記載コマンドは `scripts/harness/harness-api/domain/value-objects/known-harness-commands.ts` に実在すること
- 記載スキル名は `skills/` に実在すること
- L2-016 = fail-closed + 可視化された legacy 免除 / L3-006 = advisory・warning-only / integrity = ローカル警告 + CI が authoritative のニュアンスを崩さない

## 検証
- `grep` で旧表記（30 スキル / codex_hooks / CLAUDE.local.md）の残存ゼロ
- 記載コマンドの canonical 照合 green
- `npx phasegate lint` 0 violations
- story-reflection corpus 回帰 green
- README.md / README.ja.md は integrity manifest の対象外のため re-pin 不要。`integrity:verify` exit 0 維持
