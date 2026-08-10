---
adr_id: "041"
title: "agent hook の防御 trust root は config から除外不能にする"
status: Accepted
date: 2026-08-10
---

# agent hook の防御 trust root は config から除外不能にする

<!-- @work-item-id WI-390 -->

## Context

GitHub #50 の Grok 実機 smoke で、pre-tool-use hook は `.husky/*` 書き込みを正しく block したが、
block 文面に含まれた `phasegate.config.json protectedFiles.exclude` の手順を agent が実行し、再試行を成功させた。
既存 `ProtectedFileList` は config 自身を既定保護せず、すべての default pattern を同じ `exclude` で削除できる。
したがって gate の authorization input を gate 対象 agent 自身が書き換えられる循環が成立する。

ADR-039 は authorization を hook が観測・検証できる state に限定したが、観測対象 config の保全境界は未定義だった。
ADR-038 は自己修復デッドロック回避のため config direct Write を全状態で fail-open としたが、その後
`install` / `init` / `setup:agent` / `config:plan --apply` という managed command が整備され、direct agent mutation を
唯一の recovery path とする必要はなくなった。

## Decision

### 1. trust root patterns を config から除外不能にする

次の path は `protectedFiles.exclude` より上位の non-excludable set とする。

- project / personal `phasegate.config.json`
- `.phasegate/baseline.json`
- `.husky/**`
- root agent instruction (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`)

通常の formatter / compiler / package files と user additional patterns は従来どおり exclude 可能とする。

### 2. config direct Write/Edit は config 状態を問わず block する

valid / missing / invalid-json / invalid-schema のいずれでも、agent hook 経由の config direct mutation は
path-based protected-file block とする。diff の「緩和方向」判定は採らない。before content の欠落、partial Edit、
encoding、複数 path mutation により agent-controlled diff を authorization 根拠にできないためである。

### 3. recovery path を managed command と human out-of-band edit に分離する

- supported intent: `phasegate config:plan --intent ... --dry-run/--apply`
- bootstrap: `phasegate install|init|setup:agent ... --apply`
- invalid-schema や未対応 intent: 人間が agent hook 外で review して編集

hook / doctor 自体の config load fail-open と無関係操作の継続は ADR-038 のまま維持する。

### 4. block message に解除レシピを出さない

stderr は managed route と documentation / human review を案内し、具体的な `protectedFiles.exclude` pattern を
出力しない。security control の解除方法は agent-facing error contract に含めない。

## Consequences

- agent が hook の文面を実行して同一 session 内で防御を解除する経路は閉じる。
- 既存 config が trust root を exclude していても新 version では無視される。
- agent による arbitrary config editing はできなくなる。managed intent がない変更は人間の明示操作が必要になる。
- ADR-038 の config 自身への編集行を改訂し、missing/invalid 状態の fail-open は hook 起動と無関係操作に限定する。
- Markdown を一般 docs 分類しても root agent instructions は protected 境界で先に止まる。

## Alternatives

1. **緩和方向の JSON diff だけ block** — partial edits と invalid config で正しく比較できず、判定不能が新たな bypass になる。
2. **block 後に confirmation token を要求** — agent が自己申告できない observable state の設計と lifecycle が必要で、本 WI の managed command より複雑。
3. **message だけ変更** — config 自身が writable なため agent がソースや schema から同じ bypass を発見でき、trust boundary は直らない。
