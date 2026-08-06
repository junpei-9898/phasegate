---
id: WI-367
type: story
severity: medium
status: tested
affects: [ci-governance, harness-api]
source: GitHub issue #42（テンプレート実体を node_modules 外から取得する正規手段が無い）
---

# WI-367: `phasegate templates list` / `templates show <name>` コマンド新設

<!-- @work-item-id WI-367 -->

## 背景

issue #29 の quick スコープ対応（WI-356〜358）で「到達不能テンプレパスの案内」は
修正したが、テンプレート実体を **node_modules を Read せずに** 取得する正規手段が無い。

- consumer プロジェクトでは phasegate は `node_modules/phasegate/templates/` に入る
- Claude Code / Codex の sandbox は `node_modules` の Read を deny する設定が一般的
- `install --personal` 経路では repo に `skills/` すら無いケースがある

`skills list` / `skills info <name>` は同じ問題を stdout 出力で解いている。
テンプレートにも同型の出口が必要。

## 要求

1. `phasegate templates list` — 利用可能なテンプレート名を一覧表示する
2. `phasegate templates show <name>` — テンプレート本文を stdout に出力する
3. `<name>` は **ホワイトリスト照合**で受ける。`templates/` の readdir 結果と
   完全一致した項目のみ解決対象とし、生のパス結合は行わない（path traversal 禁止）
4. `known-harness-commands.ts` にアルファベット順を保って追加する
   （conformance テストが main.ts の `case` ラベル集合との一致を強制する）
5. `docs/guide/cli-reference.md` を更新する

## 非スコープ

- テンプレートの書き込み（scaffold）は WI-368 の担当
- `templates/` 配下のテンプレート追加そのものは WI-368 の担当
