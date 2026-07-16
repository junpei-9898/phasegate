---
id: WI-282
type: story
severity: high
status: drafted
affects: [world-model, traceability-model, nyquist-validation, validator-system, attestation, ci-governance]
source: internal
---

# WI-282: World node identity と fragment locator の確立

<!-- @work-item-id WI-282 -->

## 背景

World Model が変更前後の事実を比較し、constraint endpoint を再解決するには、content digest や表示位置とは独立した node identity が必要である。一方、現行 corpus では WorkItem / Story / AC の明示 ID は存在するが、Markdown heading、source file、matrix TestReference、`@work-item-id` / `@attestation` の出現位置は rename・並べ替え・行挿入で変化する。

本 WI は `docs/inception/_cross/WI-280/delivery_plan.md` の WM-02 を実行し、World node の ID schema、file identity と fragment identity の分離、明示 fragment marker、legacy whole-file fallback、rename / move / delete / duplicate / alias、proposal と canonical の reflection relation を決定する。

## スコープ

- Artifact / Fragment / WorkItem / SourceFile / TestReference / ExplicitClaim / Constraint / Snapshot の ID 形式
- project-relative path を用いる locator と明示 logical identity の分離
- Markdown の明示 fragment ID marker と locator 範囲
- heading text / heading level / document order と identity の関係
- legacy whole-file fragment から明示 fragment への段階移行
- rename / move / delete / duplicate ID / alias の意味
- inception proposal と product canonical の reflection relation
- 現行 `@work-item-id` / `@attestation` / matrix reference / integrity target の World 上の扱い

## スコープ外

- content digest、Unicode / line-ending normalization、canonical JSON、snapshot root の計算（WM-03 / ADR-033）
- constraint fingerprint、evaluation、adoption baseline、waiver の意味論（WM-04 / ADR-034〜035）
- declaration filename、CLI、report output、config（WM-04 / ADR-037）
- fragment marker の既存 corpus への一括付与、source / parser 実装（WM-05 以降）

## 受け入れ基準

- 全対象 node type の ID schema が versioned 文字列表現として定義されている。
- Artifact / SourceFile の path identity と、明示 Fragment の path 非依存 identity が区別されている。
- Markdown marker の構文、binding、重複時の挙動が一意である。
- heading text / level / order は Fragment identity に使われない。
- legacy whole-file fallback の導入・mixed mode・retirement 条件が定義されている。
- rename / move / delete を content digest から推論せず、明示 alias のみで continuity を表す。
- product / inception を同一 node にせず、WorkItem provenance と明示 reflection edge で接続する。
- 現行 annotation の事実を stable ExplicitClaim に偽装しない。

## 成果物

- `docs/inception/_cross/WI-282/description.md`
- `docs/inception/_cross/WI-282/domain_model.md`
- `docs/inception/_cross/WI-282/logical_design.md`
- `docs/ADR/032-world-node-identity.md`

## 依存と後続

- ADR-031 / WI-281 の ownership、artifact kind、corpus role、Unit filename canonicalization を前提とする。
- ADR-032 承認後に WM-03 の canonical snapshot / hashing 設計へ進む。
- ID schema の実装と extractor 導入は WM-07〜10 が担当する。
