# WI-304 Logical Design: SessionStart World summary

<!-- @work-item-id WI-304 -->

## Flow

```text
session-start-hook
  -> LoadResolvedConfigUseCase
  -> world.enabled / world.sessionStart.enabled
       false -> World sectionなし、query port未実行
       true  -> GetOpenWorldObligationsContextUseCase
  -> WorldObligationsQueryPort (agent-integration application)
  -> WorldModelOpenObligationsQueryAdapter (agent-integration infrastructure)
  -> world-model public createWorldModelModule(...)
  -> deriveWorldObligationsUseCase.execute(writeReport=false)
  -> plain query result
  -> application priority sort / adopted count projection
  -> buildWorldObligationsSessionContext(maxItems,maxChars)
  -> integrity context + World context + base session context
```

## Public facade and import boundary

adapterは`world-model/index.ts`だけをimportし、application port、repository、report DTO、domain VOへdeep importしない。derive resultからstable fieldsだけをlocal plain DTOへcopyし、waiver object、subject / expected / observed、diagnostic detailsを捨てる。`writeReport:false`を固定し、`.harness/world-obligations.json`を読まない。

## Display contract

presentationはheader、entry、adopted summary、省略lineを含むWorld section全体をUnicode scalarで測る。entryを途中切断せず、maxItemsとmaxCharsの双方を満たすprefixだけを採用する。残数があれば`... N more; run phasegate world:derive`を末尾へ置く。このlineもcapへ含め、極小maxCharsで固定framing自体が収まらない場合はsectionを空にしてhard capを優先する。

self-repoの604 adopted legacyは`- Adopted legacy: 604 (summary only)`の一行だけになる。blocking itemとcleanup itemを先に表示し、adopted legacyをmaxItemsへ数えない。

## Fail-open and spotlighting

config load / query / derive失敗時は固定一行`World obligations unavailable ... continuing fail-open`を追加し、error messageやrepository textを引用せずhook exit 0を保つ。表示fieldはvalidated stable ID、WCR code、classification、countだけで、既存spotlighting規約上のfree textを中継しない。将来free textを追加する場合は`wrapUntrustedData`を必須とする。
