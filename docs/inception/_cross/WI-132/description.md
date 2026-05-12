---
id: WI-132
type: issue
severity: normal
status: tested
affects: [validator-system, harness-api, traceability-model, documentation]
source: internal
---

# WI-132: Public contracts must declare required behavior cases and matching tests

> 起票日: 2026-05-10
> 起票経緯: Review-less quality gate discussion で、public API / CLI / Port / domain behavior の contract がテストで観測されているかを言語非依存に検証する必要があると整理した。

## 背景

公開 contract は downstream user や agent が依存する振る舞いである。CLI command、Port interface、config schema、error code、domain behavior が存在しても、required behavior cases が test に結び付いていなければ実装品質はレビュー依存になる。

この WI は `Contract -> Required Behavior Cases -> Tests` の対応を semantic model として扱う。各言語・framework は contract extractor / test adapter として接続する。

## 本 WI でやること

1. `PublicContract` model を定義する: CLI command / API endpoint / Port / config option / domain behavior / error code。
2. contract 種別ごとの required behavior case を生成する。
3. required behavior case と test observation の対応を検証する。
4. CLI docs にある command と E2E test の対応を既存 L2-013 より意味的に強化する。
5. Port interface と adapter contract test の対応を検証する。

## 受け入れ基準

- [ ] public contract と required behavior case の semantic model が定義されている。
- [ ] CLI command が docs にあるのに E2E observation がない場合に report できる。
- [ ] Port があるのに adapter contract test がない場合に report できる。
- [ ] config option の default / invalid / boundary test 不足を report できる。
- [ ] error code contract の error path test 不足を report できる。

## 関連

- WI-131: Requirement-to-test intent coverage must verify observed acceptance criteria
- WI-137: Error contract quality must be statically validated
