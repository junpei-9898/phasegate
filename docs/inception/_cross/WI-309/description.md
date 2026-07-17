---
id: WI-309
type: fix
severity: high
status: drafted
affects: [validator-system]
source: internal
---

# WI-309: Restore WI-305 validator domain reflection

<!-- @work-item-id WI-309 -->

## 背景

WI-305はvalidator-system domainへ`DesignChangeDeclarationPolicy`を追加し、logical / unit-test / integration-test constructionへ反映したが、`domain_model.md`への`@work-item-id WI-305`付き累積反映を欠落させた。story reflection corpusはこれをbaseline外の新規違反として正しく検出した。

## 修正

- `docs/product/construction/validator-system/domain_model.md`へWI-305の実装済みdomain service contractを追記する。
- pinned endpointだけを検査するscope、exact key、trailerとのintersection、deterministic finding、不変条件を実コードと一致させる。
- reflection baseline / allowlistは変更しない。

## 受け入れ基準

- `validator-system|WI-305|domain_model.md`のreflection violationが消える。
- 記載内容が`design-change-declaration-policy.ts`のplain input / pure evaluationと一致する。
- WI-305のblocking面を拡張せず、Git observation / World extraction / commit-msg presentationをdomain責務へ混入させない。

## 非目標

- `DesignChangeDeclarationPolicy`のsource semantics変更
- reflection baselineへの追加
- WI-305のaffects、WCR、L2-017 / L3-008 policy変更
