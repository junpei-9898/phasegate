# TDD実装計画: WI-268 (L3-007 coverage-attestation-verification)

<!-- @work-item-id WI-268 -->

## 1. スコープ

- 対象: coverage_report の `<!-- @attestation <id> -->` 参照を requirement-test-matrix に対して authoritative に突合する L3 validator（L3-007）。
- 受け入れ基準:
  - 解決不能な参照（matrix に該当 story-id 無し／testReferences 0 件）→ fail-closed FAIL。
  - 解決可能な参照のみ → PASS。
  - 参照 0 件 → PASS（matrix を読みに行かない）。
  - ungated-legacy マーカー付きファイルは対象外。
  - matrix 不在・parse 不能 かつ 参照ありは fail-closed FAIL。
- 影響する層: Domain（VO + service）/ Application（port + usecase override）/ Infrastructure（fs adapter）/ composition-root / config-foundation mapper / e2e registry test。

## 2. 前提条件検証

- validator-system Unit の `logical_design.md` / `domain_model.md` は存在（phase-gate 通過可）。
- `implementation-readiness-checker`: 本 WI は cross-cutting（_cross/WI-268）。既存 L3-005/L3-006 の縦切りパターンが確立済みで readiness 相当条件（設計 3 文書 + 既存パターン）を満たす。

## 3. TDD実装順序（テストピラミッド準拠）

### 1. Unitテスト (RED → GREEN → REFACTOR)

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `CoverageAttestationVerificationService` | INV-A（解決不能 → error）/ INV-B（参照なし → 空）/ INV-C（severity=error） | domain service + VO |

### 2. ITテスト (RED → GREEN → REFACTOR)

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `FileSystemCoverageAttestationVerificationAdapter` | 参照抽出（ungated-legacy 除外・複数参照）/ matrix 解決 / matrix 不在 fail-closed / 参照0件で matrix 未読 | fs adapter |
| `RunL3ValidatorsUseCase` override | L3-007 の pass/fail/skip 分岐 | usecase 配線 |
| 実 corpus 統合（`coverage-attestation-verification-corpus`） | 現 corpus（参照0件）で PASS | 統合テスト |

### 3. E2E/回帰

| 対象 | テスト内容 |
|------|----------|
| l0-validator-e2e (T-042) | registry 期待リストに L3-007 追加 |

## 4. 環境検証チェックリスト

- [x] Vitest 実行可能（既存テスト green 前提）
- [x] `npx phasegate lint` 実行可能
- [x] `validate --layer L2 / L3` 実行可能

## 5. QA

なし（スコープはユーザー事前承認済み。突合 vs 再実行は description.md で判断済み）。

## 6. 前提条件・リスク

- **リスク**: L3-007 を default-ON force-include すると e2e 固定 assert（T-042）と衝突 → 期待リスト更新で対応（WI-259 前例）。
- **リスク**: fail-closed だが matrix 不在で無関係 PJ が落ちる懸念 → 「参照 0 件なら matrix を読まない」で緩和。現 corpus は参照 0 件ゆえ緑。
- **影響範囲**: validator-system + config-foundation mapper。ci-governance の CiCheckResult severity 集約は L3-007 が error tier だが現 corpus では FAIL しないため overall PASS を維持（追加 assert 不要な範囲）。
