---
adr_id: "019"
title: "「AI 非依存」の境界 — trust 境界は機械的、AI は生成のみ"
status: Accepted
date: 2026-07-05
---

# 「AI 非依存」の境界 — trust 境界は機械的、AI は生成のみ

## Context

ADR-006（エージェント非依存設計原則）は、全バリデータが **ファイルシステムに書き込まれた成果物のみ**（path / 内容 / AST）を検査対象とし、エージェント固有の API に依存しないことを定めた。

2026-07-04 の監査メモ（`docs/inception/_shared/security_audit_2026-07-04.md` §1）は、この「AI 非依存」の**粒度が曖昧**であることを指摘した。

- 「品質ルールが agent 非依存」は真である。
- しかし「全機能が agent 非依存」は偽である。phasegate 自身が、意味のある成果物を **生成する** ための AI 駆動・phasegate 固有スキル（`story-implementor`, `quick-implementor` など）を既に同梱しており、これらは AI エージェントが実行する。すなわち **生成側には既に AI が存在する**。

一方、汎用化ロードマップが挙げるセマンティック系のアイデア（semantic triple graph / AC 単位のトレーサビリティ、name-equivalence / ユビキタス言語レジストリ、rationale 必須化）は、素朴に LLM 推論へ寄せると、次のいずれかのリスクを負う。

- AI 非依存という価値提案そのものを壊す（検証に AI 判断が混入する）
- あるいは著者に過大な記述負担を課す

新しい先例として **artifact-conformance test**（例: `scripts/harness/__tests__/unit/skill-quality/quick-implementor-skill-conformance.test.ts`、story H10-04）がある。これは markdown 成果物が特定の必須ディレクティブを含むかを **LLM を一切使わず機械的に** アサートするものであり、機械的（＝ AI 非依存）検証が raw AST よりさらに遠くまで届くことの証左である。

## Decision

「AI 非依存」を、全機能の性質ではなく **trust 境界（バリデータ / ゲート / 今後導入する attestation）の性質** として厳密に再定義する。この命名を明示することで、監査が指摘した曖昧さを解消する。

1. **trust を付与する検査 — attestable な「green」を生み得るすべて — は、厳密に機械的かつ再現可能であり続ける。** 対象は path / 内容 / AST / content-conformance アサーション、およびユーザーが記述したレジストリ・アノテーションに対する整合性検査である。**LLM / AI 判断が検証（validation）の一部になることは決してない。**

2. **AI は生成側で許容され、かつ期待される。** phasegate 固有スキルが成果物を生成する用途、および著者の補助として AI を使ってよい。ただし AI が生成したすべての成果物は、その後に機械的ゲートで検証される。**AI が trust を付与することはない。**

3. **セマンティックな要件（name-equivalence、intent / rationale）は、ユーザーが記述したデータ** — ユビキタス言語レジストリ、AC 単位のアノテーション、ADR / WI リンクの必須化 — として表現し、それを **機械的に** 検査することで機械化する。**LLM 推論では機械化しない。**

4. 本決定は **ADR-006 を維持・先鋭化するもの**であり、そのスコープを精緻化する（supersede しない）。

5. 明示的に、**AI 補助のバリデータ tier は導入しない。** 将来あるセマンティック検査がそれを正当化する場合でも、それ自身の tightly-scoped な ADR を必要とし、non-blocking（advisory）でなければならず、attestation から除外されなければならない。

位置づけの要約:

| 側 | AI の可否 | trust の源泉 |
|----|----------|-------------|
| 生成（成果物の作成・著者補助） | 許容・期待 | trust は付与しない |
| 検証（ゲート / attestation） | 不可 | 機械的・再現可能な検査のみ |

## Consequences

- attestation が絶対的かつ再現可能になる。誰でも AI なしで「green」を再検証できる。
- セマンティックカバレッジは、レジストリ / アノテーションが表現できる範囲に有界となる（著者の記述負担を受け入れる）。
- 「チェッカーは常に機械である」というアイデンティティが保たれる。
- モデル / バージョンのドリフトでゲートが flaky になることがない。
- 計画中の署名付き attestation（signed-attestation）ワークを可能にする土台となる。

## Alternatives

1. **現状維持** — 曖昧なまま「AI 非依存」を全機能の性質として語る。監査が指摘した矛盾を放置するため不採用。

2. **機械的ゲート + non-blocking な AI-advisory バリデータ tier** — 現時点では不採用。理由は (a) gate-creep のリスク（advisory が事実上のゲート化する）、(b) AI の findings は再現不能で attestation を毀損する。将来の tightly-scoped なオプションとしてのみ残す。

3. **原則を「機械的に検証可能なら AI も許容（AI の出力が決定的に検査できる限り）」へ再定義** — 中核的な価値提案に対する変更が大きすぎるため不採用。

関連: ADR-006（エージェント非依存設計原則）、ADR-020（単方向規律と逆流学習）、`docs/inception/_shared/security_audit_2026-07-04.md` §1。
