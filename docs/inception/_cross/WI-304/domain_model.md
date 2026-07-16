# WI-304 Domain Model: SessionStart World obligation context

<!-- @work-item-id WI-304 -->

## OpenWorldObligationContextItem

agent-integration application DTO。`kind`、`classification`、`ruleId`、`constraintId`、`violationFingerprint`、`subjectId`だけを保持する。constraint prose、waiver reason、semantic debt title / reason、policy diagnostic detailsを保持しない。

## WorldObligationsQueryResult

consumer-owned portのplain result。

- `available`: current pure deriveから得たstructural / cleanup / policy entryとadopted legacy件数
- `unavailable`: trustworthy summaryを導出できない。repository由来error textはpresentationへ渡さない

disabledはquery resultでなくusecase inputで扱い、portを呼ばない。

## OpenWorldObligationsContextService

application usecaseがquery resultをpriority順へ正規化する。

| Order | Item |
|---:|---|
| 1 | blocking structural: `new-structural`, `invalid-declaration` |
| 2 | blocking policy: `expired-waiver`, other policy diagnostic |
| 3 | `cleanup-required` |
| 4 | active `waived` |

`adopted-legacy`はitemsから除外しcountのみ保持する。同順位はrule ID、constraint ID、fingerprint、subject IDのordinal順とする。

## Invariants

- 保存reportはinputではない。
- World disabled時はqueryを実行しない。
- DTOはplain immutable dataでWorld Entity / VOを含まない。
- unavailable reasonをrepo textのままpromptへ中継しない。
