---
id: WI-148
type: story
severity: normal
status: tested
affects: [installation]
source: internal
---

# WI-148: `phasegate reconcile` + `init` deprecation — version upgrade 追従と互換移行

> 起票日: 2026-05-11
> 起票経緯: WI-144 (umbrella) の分割実装第 4 弾（最終）。WI-145 manifest / WI-146 install / WI-147 uninstall の上に乗る「薄い」改修として、(1) version upgrade 時に managed block のみを update する `reconcile` (既存 `update-skills` を統合)、(2) `init` の deprecation warning を提供する。

## 背景

WI-145〜147 が揃うと「冪等な install / clean uninstall」が成立するが、phasegate 自体の version up 時に既存 PJ の deploy 先 (`.claude/settings.json` の hooks / `.husky/*` / template ファイル) が追従しない問題が残る。現状の `update-skills` は `skills/` の再 deploy しか行わず、`.claude/settings.json` 等は skip され続けるため、新しい hook chain が反映されない。

加えて、WI-146 で `install` が `init` の上位互換になるが、既存ユーザーへの誘導をしないと `init` がそのまま使われ続け silent failure が再現する。Deprecation warning で `install` への移行を促す。

本 WI は両者を低リスクで完了させる軽量 WI。

## 本 WI でやること

### F5-1: Reconcile command (application + presentation)

- `npx phasegate reconcile --dry-run`: manifest の各 `merged` entry について、現バージョンの template と managed block の hash を比較し、差分を表示
- `npx phasegate reconcile --apply`: managed block のみ update（user-customized 部分は触らない）
- `created` entry も hash 比較し、user 改変がなければ template に追従、改変があれば warn して skip (or `--force` で上書き)
- 既存 `update-skills` は内部実装を `reconcile` に委譲し alias として残す（破壊的互換は無し）

### F5-2: Reconcile algorithm

各 entry について以下を判定:

| 状態 | 挙動 | RepairMode |
|---|---|---|
| `merged` で managed block hash が template と一致 | skip (no-op) | mechanical |
| `merged` で managed block hash が異なる, 周囲 user 部分シンプル | block のみ replace、user 部分保持 | mechanical |
| `merged` で managed block hash が異なる, 周囲 user 部分 complex | refuse + skill 起動 hint (`--force` で強行) | **ai-assisted** |
| `created` で hash が deploy 時と同じ | template に追従して上書き | mechanical |
| `created` で hash が deploy 時と異なる (user 改変あり) | warn + skill 起動 hint (`--force` で上書き、backup 取得) | **ai-assisted** |
| manifest に無い deploy 先 (新版で追加された template) | install と同じく追加配置 | mechanical |
| template 自体の互換性 break (schema 変更等) | reconcile せず WI 単位で migration 要 | **manual** |

`ai-assisted` 判定時は WI-145 で導入する `SuggestedSkill.invokeCommand` を hint 表示する。

### F5-3: AI 委譲経路の再利用 (WI-145 で導入される `RepairMode` を使う)

reconcile は install / uninstall と異なり「version upgrade による template 変化への追従」が責務。user 改変との衝突が起きやすいため:

- ai-assisted 判定 entry については `--apply` でも自動更新せず、`SuggestedSkill.invokeCommand` を hint 表示
- 例: user が phasegate-managed hook block の前後に独自 logic を追加している場合、新版 template への更新で挙動が変わる可能性があるため `phasegate-config-doctor` 起動を推奨
- `--force` で機械的更新を強行 (backup 取得済み前提)

### F6-1: `init` deprecation warning

`phasegate init` 実行時に以下を 1 回出力:

```
⚠️  `phasegate init` is deprecated and will be removed in v1.0.
   Use `phasegate install` for idempotent setup with structured merge.
   Existing files will be left untouched (legacy behavior preserved).
   Run `phasegate doctor` to verify your installation state.
```

- 既存挙動は維持（破壊しない）
- `init` 自体の実装は WI-146 で `install` に委譲済みのため、warning 追加のみで済む

## 受け入れ基準

- [ ] `npx phasegate reconcile --dry-run` が manifest の各 entry について template との diff を表示する
- [ ] `npx phasegate reconcile --apply` で `merged` entry の managed block が update され、user 部分が保持される
- [ ] `created` entry が user 改変なしの場合は template に追従して上書きされる
- [ ] `created` entry が user 改変ありの場合は warn + skip され、`--force` 時のみ上書き（backup 取得）
- [ ] reconcile で新規追加された deploy 先 (新版 template) が install と同じく追加される
- [ ] reconcile 後、`.phasegate/manifest.json` が新 version / 新 hash で update される
- [ ] 既存 `phasegate update-skills` が `reconcile` への alias として動作する（互換維持）
- [ ] `phasegate init` 実行時に deprecation warning が出力される
- [ ] deprecation warning 出力後も `init` の既存 deploy 挙動は変わらない
- [ ] reconcile が 2 回連続実行で no-op になる（idempotent）
- [ ] `reconcile --dry-run` が entry ごとに WI-145 の `RepairMode` を判定して表示する
- [ ] `ai-assisted` 判定された entry について、`reconcile --apply` (force 無し) が refuse し skill 起動 hint を出力する
- [ ] 全コードが phasegate L1/L2 を pass する

## 非スコープ

- `init` の削除（v1.0 で別途行う）
- L1/L2/L3 validator の挙動変更
- skill 内容そのものの再設計
- manifest schema の version migration（schema v2 が必要になった場合は別 WI）

## 関連

- WI-144: install/uninstall idempotency (本 WI の親 umbrella)
- WI-145: manifest + doctor (本 WI が manifest を読み update する)
- WI-146: install with merge (本 WI が template を追従する対象)
- WI-147: uninstall (本 WI と直接の依存無し)
- `scripts/harness/setup/skill-deployer.ts` (`update-skills` の reconcile 委譲点)
- `scripts/harness/main.ts` (`case "init"`, `case "update-skills"`): warning / alias 追加点
