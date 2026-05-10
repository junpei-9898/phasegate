---
id: WI-138
type: issue
severity: normal
status: drafted
affects: [traceability-model, phase-dependency-model, validator-system, documentation]
source: internal
---

# WI-138: Traceability completeness must connect WI Unit requirement design code and tests

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、`@unit` / `@work-item-id` の存在だけではなく、変更 Unit、WI affects、product reflection、test observation、public docs 変更の整合を構造的に検証する必要があると整理した。

## 背景

Traceability が揃うと、実装が要求から逸れていないかをレビューなしでも発見しやすくなる。現状の metadata validator / story reflection は基盤として有効だが、変更 Unit が WI `affects` に含まれるか、test が同じ WI を検証しているか、public docs 変更が CLI/API 変更と同期しているかまでは十分に統合されていない。

この WI は requirement / WI / Unit / design section / code / test の graph completeness を検査する。

## 本 WI でやること

1. `TraceabilityGraph` model を定義する: WI / Unit / requirement / product section / source file / test case / public docs。
2. staged changes または repository scan から graph edges を抽出する。
3. 変更 Unit が WI `affects` に含まれるかを検証する。
4. product docs reflection と implementation / test observation の WI が一致するかを検証する。
5. public docs 変更と CLI/API/Port 変更の同期不足を report する。

## 受け入れ基準

- [ ] WI affects と変更 Unit の不一致を report できる。
- [ ] product docs に反映された WI と test が検証する WI の不一致を report できる。
- [ ] implementation はあるが同じ WI の test observation がない場合に report できる。
- [ ] public docs 変更が contract 変更と同期していない smell を report できる。
- [ ] existing metadata / story reflection validator と責務分担が明確である。

## 関連

- WI-126: Work item status must be derived and updated by PhaseGate
- WI-131: Requirement-to-test intent coverage must verify observed acceptance criteria
