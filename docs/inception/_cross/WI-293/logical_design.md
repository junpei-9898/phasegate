# WI-293 Logical Design: Constraint evaluation

<!-- @work-item-id WI-293 -->

## Domain flow

```text
raw declaration admission
  -> ConstraintRecord | MalformedConstraintDeclaration
Snapshot candidates + optional baseline + aliases + explicit relations
  -> endpoint resolution
  -> relation / dependency / digest rules
  -> policy-free ConstraintEvaluationResult
```

domainはfilesystem、JSON parser、clock、hash provider、他Unit型をimportしない。WM-13のadapterがraw JSONを本domain inputへ変換する。

## Rule evaluation

- WCR-001: malformed declarationを一件のadmission findingへし、他ruleへ流さない。
- WCR-002 / 003: baseline exact evidenceの有無で排他的に選ぶ。
- WCR-004: duplicate alias declaration、chain、missing target、role mismatchを扱う。
- WCR-005: exact IDまたはalias targetのcandidate cardinalityが複数。
- WCR-006: `references` / `refines`の明示relation不在。
- WCR-007: `depends-on`の明示relation不在。
- WCR-008: resolved endpoint対pin不一致。`content-equals`は両current digestも比較する。

`reflected-as` edge、同一heading、同一digest、同一WorkItemから`refines`を作らない。`ExplicitConstraintRelation`はsourceをconstraint declarationへ固定する。

## Incremental contract

changed candidateがclaimant / premiseのいずれかに一致すればrecordを再評価する。incremental APIはaffected recordの旧findingを除去してcurrent findingへ置換し、unaffected findingを保持後にcanonical sortする。同一current inputに対するserialized resultはfull evaluationと一致する。

## Public boundary

WM-12はdomain fileだけを追加する。composition root、CLI、top-level public indexは変更しない。後続application / repositoryはdomain型をUnit内で利用する。
