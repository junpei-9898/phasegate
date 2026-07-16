---
id: WI-299
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-299: README / CLI Reference へ World Model（WI-280 機能 MVP）を反映する

> 起票日: 2026-07-17
> 起票経緯: WI-281〜298 で World Model 機能 MVP（`world:inspect` / `world:pin` / `world:derive`、v0.231.0〜v0.253.0）が着地したが、ユーザー向けドキュメント（README.md / README.ja.md / docs/guide/cli-reference.md）に World Model の記述が存在しない（`grep -ri world` でゼロ件）。

## Acceptance Criteria

### README.md
- [ ] Core Capabilities 表に World Model 行を追加
- [ ] World Model 節を新設（対称化の要点 / 3 コマンド / immutable obligation report / adoption baseline / fail-closed 新規違反 / 現状は CLI-only で L2/L3 gate 登録は将来フェーズ、という誠実な位置づけ）
- [ ] CLI Reference 表に `world:inspect` / `world:pin` / `world:derive` を追加

### README.ja.md
- [ ] 主な機能表・World Model 節・CLI 表の対訳を追加
- [ ] footer の版表記を現行に更新

### docs/guide/cli-reference.md
- [ ] World Model 節を新設（3 コマンドの options / exit code / 制御ファイル / config キー `world` の既定値）

## 正確性の制約
- 記載コマンド・フラグは `scripts/harness/main.ts` の usage 定義と `known-harness-commands.ts` に実在すること
- exit code 契約（0 = clean / 1 = blocking or diagnostics / 2 = contract error）は ADR-037 と一致させること
- 「L2-017 / L3-008 は予約のみで未登録（Phase C 判断待ち）」「`world.enabled` 既定 false、明示コマンドは常に実行可」のニュアンスを崩さないこと

## 検証
- 記載コマンドの canonical 照合 green（L4 skill-catalog 系は対象外の docs 変更）
- `validate --layer L2` green
- README は integrity manifest 対象外のため re-pin 不要
