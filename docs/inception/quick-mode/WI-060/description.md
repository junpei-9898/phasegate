---
id: WI-060
type: story
severity: normal
status: reflected
legacy_id: H10-06
---

# H10-06: WI-aware quick-implementor trivial path

## 背景

ISSUE-026 Phase Dでは、`type: fix | chore` の work item を description.md + commit/PR証跡で完結できる軽量パスとして扱う。Quick Mode の入口である `quick-implementor` は、このWI taxonomyを明示的に理解する必要がある。

## 要求

- `type: fix | chore` のWIはQuick Mode対象候補として扱う。
- `type: story | issue | refactor` のWIはFull Mode / `story-implementor` にエスカレーションする。
- Quick Modeでも `Work-Item: WI-XXX` trailer をコミットに含めるよう指示する。

## 完了条件

- `skills/quick-implementor/SKILL.md` にWI-awareルールが明記される。
- `.claude/skills/quick-implementor/SKILL.md` に同じ内容が反映される。
