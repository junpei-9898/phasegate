---
adr_id: "021"
title: "severity 契約 — 格下げ禁止"
status: Accepted
date: 2026-07-05
---

# severity 契約 — 格下げ禁止

## Context

phasegate は品質防御ツールであり、その検査結果 severity（`error` / `warning`）はゲートの通過可否を左右する。各 error code は canonical カタログ（`ErrorDefinition`）に `defaultSeverity` を持ち、これがその code の最小限の重大度を規定する。

呼び出し側（orchestration 層 / CLI）は effective severity を明示的に要求できるが、ここに **severity を静かに弱めてゲートをすり抜ける** という抜け道のリスクがある。例えば `defaultSeverity=error` の違反を `warning` に格下げすれば、`--fail-on-error` 系の終了コード判定を回避できてしまう。これは「チェッカーは常に機械であり、trust は機械的・再現可能な検査のみが付与する」という ADR-019 の trust 境界、および「単方向の強制は交渉不可」という ADR-020 の単方向規律の精神に反する — severity の格下げは、検査が既に検出した違反を事後的に無力化する行為だからである。

この格下げ禁止ルールの実体は既に `scripts/harness/harness-error/domain/services/severity-contract-enforcer.ts`（`SeverityContractEnforcer`）に実装され、`docs/product/construction/harness-error/logical_design.md` §2.3.3 / §4.6 に規定されている。しかし ADR としては未文書化であり、`SeverityDowngradeViolationError` のメッセージは根拠として ADR-017（warning severity の集計 / `failOnWarning`）を誤って参照していた。ADR-017 は集計側の決定であって格下げ禁止を定めるものではない。本 ADR-021 は、この既存ルールを前方文書化し、格下げ禁止を実際に決定する ADR として位置づける。

## Decision

error の effective severity を、その canonical `defaultSeverity` より **下位へ格下げすることを禁止する。**

- `SeverityContractEnforcer.resolveEffectiveSeverity(requested, defaultSeverity)` は次のように振る舞う。
  1. `requested` 未指定なら `defaultSeverity` を返す。
  2. `requested` が `defaultSeverity` より高位（格上げ）なら `requested` を返す — 格上げは許容する。
  3. `requested` が `defaultSeverity` と同一なら `requested` を返す。
  4. それ以外（格下げ）は `SeverityDowngradeViolationError` を throw する。
- 不変条件として `error -> warning` の格下げは常に拒否される。
- 格下げ違反時のメッセージは **違反内容（default / requested の両 severity）と根拠（本 ADR-021）** を必ず含む。これにより違反の再現・監査が機械的に可能になる。

trust 境界の性質上（ADR-019）、この判定は LLM を一切用いず、値の比較のみで機械的に完結する。

## Consequences

- severity が黙って弱められてゲートをすり抜けることが構造的に不可能になる。attestation の「green」が severity の観点でも信頼できる。
- 呼び出し側は severity を格上げ（より厳格化）することはできるが、格下げはできない。厳格化の一方向のみが許容され、ADR-020 の単方向規律と整合する。
- `defaultSeverity` を運用上どうしても下げたい正当なケースがある場合、それは呼び出し側での格下げではなく **canonical カタログ（`ErrorDefinition`）の `defaultSeverity` そのものを前方フローで変更する** ことでしか実現できない。これは意図的な設計判断を前方ゲート経由で通すことを強制する。

## Alternatives

1. **格下げを警告のみとし throw しない** — 事実上の格下げを許すため抜け道が残る。品質防御の目的に反するため不採用。

2. **格下げ禁止を throw で強制（本決定で採用）** — 格下げは `SeverityDowngradeViolationError` を throw し、メッセージに違反内容と根拠 ADR-021 を含める。

3. **呼び出し側で任意の severity 上書きを許容し、カタログを advisory 扱いにする** — canonical カタログの規範性が失われ、severity 契約が有名無実化するため不採用。

関連: ADR-019（「AI 非依存」の境界 — trust 境界は機械的）、ADR-020（単方向規律と逆流学習）、ADR-006（エージェント非依存設計原則）、ADR-017（warning severity の集計 / `failOnWarning` — 集計側の別決定）、`docs/product/construction/harness-error/logical_design.md` §2.3.3 / §4.6。
