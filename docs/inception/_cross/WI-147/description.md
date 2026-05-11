---
id: WI-147
type: story
severity: high
status: drafted
affects: [harness-api, setup]
source: internal
---

# WI-147: `phasegate uninstall` — manifest-driven clean removal で残骸を残さない

> 起票日: 2026-05-11
> 起票経緯: WI-144 (umbrella) の分割実装第 3 弾。WI-145 で提供される manifest 基盤を読み、`created` entry の削除と `merged` entry の managed block 除去を構造的に行う `phasegate uninstall` を実装する。「phasegate を取り除こうとしても何が phasegate 由来か判らず残骸が散る」問題を根絶する。

## 背景

現状の `scripts/harness/main.ts` に `uninstall` / `cleanup` / `teardown` 系コマンドは存在しない。一方 `init` は 15 種の deploy 先に書き込む。差分を機械的に判別する manifest が無いため、ユーザーが phasegate を外そうとすると手動で消すしかなく、消し漏れによる「機能はないが残骸あり」のゾンビ状態が発生する。

WI-145 で `.phasegate/manifest.json` が deploy 先を `created` / `merged` の区別付きで記録するようになるため、本 WI はそれを読んで reverse operation を実装する。WI-146 と並列実装可能（依存は WI-145 のみ）。

## 本 WI でやること

### F4-1: Uninstall reverse-op (application layer)

manifest の各 entry を mode 別に処理:

- **`created`**: file を削除
  - hash 一致を確認し、改変があれば warn + `.phasegate/backups/uninstall-{timestamp}/` に snapshot を保存してから削除
  - `--force` 無しでは改変ファイル削除を refuse
- **`merged`**: managed block のみ削除
  - JSON: phasegate-managed hooks entry を array から除去、`permissions.deny` の union 差分を引く
  - Shell: `# === phasegate managed (BEGIN) ===` 〜 `# === phasegate managed (END) ===` block を削除（前後の user 部分は保持）
  - `package.json`: `devDependencies.phasegate` 削除、`scripts.phasegate:*` 削除（user 改変 scripts は保持）
- 空になった directory は cascade で削除（`.claude/scripts/`, `.husky/_/` 等）。**ただし directory 内に user file があれば残す**

### F4-2: Uninstall CLI (presentation layer)

- `npx phasegate uninstall --dry-run`: 削除対象 entry の一覧と reverse-op の diff を表示
- `npx phasegate uninstall --apply`: 実行
- `npx phasegate uninstall --force`: hash mismatch entry も削除（backup は取る）
- 完了後 `.phasegate/manifest.json` を `.phasegate/uninstalled-{ISO-timestamp}.json` に rename（履歴として保持、再 install 時の参照に使える）
- `.phasegate/` 自体は manifest 削除後にも残す（backup / 履歴を保持するため）

### F4-3: Edge case 処理

- manifest が無い場合: `phasegate doctor` で heuristic 検出 → 「manual cleanup が必要」を案内（自動判別はしない）
- manifest entry の path が既に存在しない場合: skip して info 出力
- managed block が見つからない `merged` entry: user が手動で削除済みと推定し skip

### F4-4: AI 委譲経路の再利用 (WI-145 で導入される `RepairMode` を使う)

`uninstall --apply` 実行時、各 entry の reverse-op が **機械的に安全か** を判定:

- `mechanical`: `created` entry の hash 一致 file 削除、`merged` entry の managed block clean 除去 → 自動実行
- `ai-assisted`: hash mismatch の `created` entry / managed block が complex な周辺 logic と絡んでいる `merged` entry → uninstall を **refuse** し `SuggestedSkill.invokeCommand` を hint 表示。例えば user が phasegate hook の周囲に独自 logic を追記している場合、機械的 block 除去で周辺が壊れるため `phasegate-config-doctor` 起動を推奨
- `manual`: phasegate 自動判断不可 (例: symlink target の cascade 影響範囲) → uninstall せず警告のみ

`uninstall --force` 適用時のみ ai-assisted も強制削除する (`.phasegate/backups/uninstall-{timestamp}/` に snapshot 取得済み前提)。

## 受け入れ基準

- [ ] `npx phasegate uninstall --dry-run` が `.phasegate/manifest.json` を読んで削除対象を列挙する
- [ ] `npx phasegate uninstall --apply` で `created` entry が削除される（hash 一致時）
- [ ] `merged` entry の managed block が削除され、user 部分は保持される（`.claude/settings.json` / `.husky/*` / `package.json`）
- [ ] uninstall 後、ユーザー自前の `.claude/settings.json` / `.husky/pre-commit` が正常動作する状態で残る
- [ ] hash mismatch の `created` entry は `--force` 無しでは削除されず warn が出る
- [ ] `--force` 適用時、改変前のファイルが `.phasegate/backups/uninstall-{timestamp}/` に保存される
- [ ] 空になった phasegate-only directory が削除される（user file を含む directory は保持）
- [ ] uninstall 完了後 `manifest.json` が `uninstalled-{timestamp}.json` に rename される
- [ ] `uninstall --dry-run` → `uninstall --apply` → `phasegate doctor` の sequence で doctor が「phasegate 未導入」状態と判定する
- [ ] reverse merge logic (JSON / shell / package.json) が単体テストでカバーされる
- [ ] `uninstall --dry-run` が entry ごとに WI-145 の `RepairMode` を判定して表示する
- [ ] `ai-assisted` 判定された entry について、`uninstall --apply` (force 無し) が refuse し skill 起動 hint を出力する
- [ ] `uninstall --force` 適用時、ai-assisted も強制削除し改変前 backup を取る
- [ ] 全コードが phasegate L1/L2 を pass する

## 非スコープ

- F1 install / F2 doctor / F3 manifest — WI-145, WI-146
- F5 reconcile / F6 init deprecation — WI-148
- manifest が無い既存 PJ への自動 cleanup（doctor で hint のみ）
- skill 削除以外の clean (npm package 自体の uninstall)

## 関連

- WI-144: install/uninstall idempotency (本 WI の親 umbrella)
- WI-145: manifest + doctor (本 WI が manifest を読む)
- WI-146: install with merge (本 WI が逆操作する対象を書く側)
- WI-148: reconcile + init deprecation
- `scripts/harness/setup/`: uninstall ロジック配置先
- `scripts/harness/harness-api/`: `uninstall` command 追加点
