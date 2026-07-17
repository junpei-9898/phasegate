---
id: WI-305
type: story
severity: high
status: drafted
affects: [agent-integration, traceability-model, validator-system, harness-api, world-model]
source: internal
---

# WI-305: Design change declaration at commit-msg

<!-- @work-item-id WI-305 -->

## 背景

World Modelは明示fragment、pin、Work Item reflectionを観測できるが、設計fragmentのstaged変更とcommit messageの宣言はまだ接続されていない。ADR-032は`@work-item-id`と`@world-reflects`を明示事実として扱い、ADR-034は変更を因果推論でなくbaseline/current差分とchanged candidateとして扱う。local hookは偽造可能なfast-pathであり、authoritativeな再導出はL3に残す。

## 目的

- traceability-modelからstaged hunkに交差する明示fragmentをplain DTOで観測する。
- world-model public facadeからconstraint endpointにpinされた明示fragmentをplain DTOで観測する。
- `commit-msg`で両観測を突合し、fragmentの`@work-item-id`とcommitの`Work-Item` trailerの共通宣言を検証する。
- `@world-reflects`を変更fragmentの明示reflection factとして公開し、意味推論を行わない。

## 受け入れ基準

- `world.enabled:false`ではstaged fragment / pinを読まず、従来のcommit-msg結果を維持する。
- product / inception corpusの`@world-fragment-id`付きfragmentだけを対象とし、staged diff hunkとfragment line rangeの交差を変更候補とする。
- pin済みendpointの変更だけを検査し、unpinned fragment、whole-file fallback、ADR / source変更へ新しいblocking面を広げない。
- pin済み変更fragmentの`@work-item-id`集合とcommitの`Work-Item: WI-NNN` trailer集合に共通IDがなければnon-bypassableでblockする。
- observation不能 / unsupported staged state / invalid control inputは固定code付きwarningとし、このlocal declaration check単独ではblockしない。
- DTOはplain immutable dataで、traceability / Worldのdomain型、parser result、repository portをpublic contractへ露出しない。
- H17-17をtestと同じ着地で`planned -> required`へ進める。

## 非目標

- commit messageから変更原因や意味的refinementを推論すること
- `@world-reflects`を全fragmentに必須化すること
- L2-017 / L3-008のclassification、baseline、waiver、WCR rulesetを変更すること
- Git hookをauthoritative trust rootにすること

## 運用

commit-msg結果は高速なdeclaration consistency checkであり、local stateとmessageは偽造可能である。constraint / obligationのauthoritative判定はL3-008がclean corpusから再導出する。
