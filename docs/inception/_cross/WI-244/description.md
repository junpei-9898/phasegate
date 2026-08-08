---
id: WI-244
type: fix
severity: normal
status: reflected
---

# WI-244: スキルの固定モデル名（Sonnet 4.6 / Opus 4.6）を役割ベース表現に置換し、モデル委任レンダラーと同期する

## Context

30スキル監査（WI-242 の P2 バッチ）。skills/*/SKILL.md の16ファイルに「Sonnet 4.6」「Opus 4.6」の
固定モデル名が26箇所あり、参照先 docs/principles/model-routing.md の「役割で判断する」方針と矛盾、
かつ実在しないバージョン表記で陳腐化している。
`renderSkillForModelDelegation`（scripts/harness/setup/skill-deployer.ts:168-180）は
これらの文言を exact-string 置換して delegation:"none" の consumer に配信しているため、
スキル本文とレンダラーはロックステップで変更する必要がある。
「Opus 4.6」はレンダラーの置換リストに元々漏れているバグもある（役割表現化で解消する）。

## Acceptance Criteria

- [ ] skills/*/SKILL.md から「Sonnet 4.6」「Opus 4.6」の全出現を役割ベース表現に置換（frontmatter の `model:` / `review:` は変更しない）
- [ ] renderSkillForModelDelegation の置換文字列を新文言と同期し、delegation:"none" レンダリングが引き続き機能する
- [ ] codex-delegator の gpt-5.4 / codex CLI 表記はスコープ外（変更しない）
- [ ] skill-deployer / installation（install・reconcile）/ skill-quality の各テストが green（既存 WI-241 WIP 失敗9件を除く）
- [ ] `grep -rn "Sonnet 4.6\|Opus 4.6" skills/` が 0 件
