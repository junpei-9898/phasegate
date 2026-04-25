# TDD実装計画: H10-06 — WI-aware quick-implementor trivial path

@story-id H10-06
設計要素: quick-implementor skill contract 更新の検証手順。

## 方針

本ストーリーはスキル契約の更新であり、コード変更は行わない。`skills/quick-implementor/SKILL.md` と `.claude/skills/quick-implementor/SKILL.md` を同期更新する。

## 検証

- `rg "Work-Item: WI-XXX|type: fix|type: chore" skills/quick-implementor/SKILL.md .claude/skills/quick-implementor/SKILL.md`
- `pnpm harness:status`
