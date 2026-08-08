---
id: WI-293
type: story
severity: high
status: tested
affects: [world-model]
source: internal
---

# WI-293: ConstraintRecord と WCR evaluator

<!-- @work-item-id WI-293 -->

## 背景

Phase AでWorldのcanonical Snapshotとread-only inspectionが完成した。Phase Bの最初のsliceとして、ADR-034が決定した明示constraint、両endpoint pin、endpoint-symmetricな構造評価をpure domainとして実装する。

## スコープ

- `ConstraintRecord`、`NodePin`、`ChangeProvenance`
- typed directed fact: `references | depends-on | refines | content-equals`
- WCR-001〜008のpolicy-free evaluation
- exact / duplicate / alias / deletion / missingの解決precedence
- explicit relationだけを対象とするreference / dependency検査
- claimant / premise双方をchanged candidateとするincremental再評価
- full / incremental evaluationのcanonical result一致
- H17-07を`planned -> required`へ進め、同じ着地のテストで全ACをbindする

## スコープ外

- constraint JSON schema / repository / atomic write（WM-13）
- violation fingerprint / obligation / adoption / waiver（WM-14）
- `world:pin` / `world:derive` CLI（WM-15）
- validator-systemのL2-017 / L3-008登録（Phase C）
- similarity、heading、digest一致からのrename / refines / cause推論

## 受け入れ基準

- malformed declarationから部分的`ConstraintRecord`を生成しない。
- claimant / premiseのどちらだけが変わっても同一constraintを再評価する。
- missingとdeletionをWCR-002 / WCR-003で排他的に分類する。
- duplicate candidateでwinnerを選ばず、unresolved endpointへWCR-008を重ねない。
- aliasなしrenameをremoved + addedとして扱い、valid explicit aliasだけをcontinuity evidenceにする。
- `refines`はconstraint declaration由来の明示relationだけを受理する。
- evaluation DTOにseverity、blocking、exit code、waiver / adoptionを含めない。
- H17-07をrequiredへ進めたmatrixでL3-004を含むL3がPASSする。
