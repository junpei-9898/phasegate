---
id: WI-029
type: refactor
severity: normal
status: tested
affects: [docs]
---

# WI-029: 5-Layer Defense Model docs の正確化（L0 = Agent runtime hooks への訂正）

> 起票日: 2026-04-25
> 関連: WI-028（migrate work-items docs 整備）との連続性

## 背景

`README.md` / `README.ja.md` / `docs/guide/layer-model.md` / `CLAUDE.md` に記載の「5-Layer Defense Model」において、L0 は **`hook-config` / `gate-check` / `FUSEフック`** として記述されているが、コードベースの実態を確認すると:

1. **`validator-system` の `L0-001 fuse-hook-config` / `L0-002 fuse-mount-status` は legacy definition**
   - `phasegate.config.json` で `layers.L0.enabled: false` として無効化されている
   - 実際の検知機能は担っていない
2. **真の L0 は `agent-integration` unit の runtime hook 群**
   - `pre-tool-use-hook.ts` / `post-tool-use-hook.ts` / `stop-hook.ts` / `session-start-hook.ts` / `user-prompt-submit-hook.ts`
   - `.claude/settings.json` / `.codex/hooks.json` 経由で Claude Code / Codex agent runtime に登録され、Write/Edit/Bash 直前で block / guide する
3. **git 側の検知経路（Husky）も docs に記載なし**
   - `.husky/pre-commit` で `phasegate pre-commit`（staged files に L2 validators 適用）
   - `.husky/commit-msg` で `Work-Item: WI-XXX` trailer を必須化
4. **L4 も `layers.L4.enabled: false`** だが docs 上は「週次実行」として稼働している体で書かれている

結果、外部 user / AI agent が docs を読んでも **どこで何が検知されるか**の正確な像が描けず、「FUSE を何かセットアップする必要があるのか」といった誤解の原因になっている。

## 本 WI でやること

### docs 訂正スコープ

| ファイル | 修正 |
|---|---|
| `README.md` | 「5-Layer Defense Model」節の L0 description を「Agent runtime hooks (PreToolUse / PostToolUse / Stop / SessionStart / UserPromptSubmit) + Husky git hooks」に書き直し。L4 は「実装あり、現状 default off」と補足 |
| `README.ja.md` | 「5層防御モデル」節で同内容を日本語訂正 |
| `docs/guide/layer-model.md` | L0 セクション全面改訂（`hook-config` / `gate-check` 記述削除、agent-integration の 5 hook 表 + Husky hook 表を追加）|
| `CLAUDE.md` | `validate --layer L0` のコメント行から "FUSEフック" を削除、runtime hook への言及に差し替え |

### スコープ外

- コード変更（validator-system の legacy `L0-001`/`L0-002` definition 削除は別 WI）
- L4 を有効化する作業（別検討）
- `.claude/settings.json` / `.codex/hooks.json` テンプレートの変更

## 受け入れ基準

- [x] `README.md` / `README.ja.md` の L0 description が agent-runtime hooks 実態と一致する
- [x] `docs/guide/layer-model.md` の L0 セクションから `hook-config` / `gate-check` 記述が削除され、agent-integration の 5 hook + Husky の 2 hook が表形式で解説される
- [x] `CLAUDE.md` から「L0 FUSEフック検証」記述が削除される
- [x] `--layer L0` CLI が引き続き動作する（本 WI は docs only、code 不変）
- [x] 既存テスト全 PASS、L1 lint violations 0

## 完了メモ

2026-05-09 監査で README.md / README.ja.md / docs/guide/layer-model.md / CLAUDE.md の L0 記述が
agent runtime hooks + Husky git hooks の実態に揃っていることを確認した。`validate --layer L0` は
互換 guidance として動作し、L4 は default off として説明されている。

## 関連

- 親コンテキスト: WI-026 → WI-027 → WI-028 の後続
- 議論ログ: 2026-04-25 の dogfood 会話で L0 実態ずれと Husky 系 / ReentryGuard / Quick-Full escalation / Bash 迂回防止 等の見落としが顕在化
