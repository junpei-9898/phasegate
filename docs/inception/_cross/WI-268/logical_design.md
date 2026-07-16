# WI-268 Logical Design — coverage-attestation-verification (L3-007)

<!-- @work-item-id WI-268 -->

## Overview

L3-007（coverage-attestation-verification）は `docs/product/construction/*/coverage_report.md` の `<!-- @attestation <id> -->` 参照を収集し、requirement-test-matrix（本ランのテスト corpus から再生成される）に対して authoritative に突合する。解決不能な参照（matrix 上に該当 story-id が無い／テスト参照 0 件）を fail-closed の error として検出する。ADR-030 §Decision.1（trust root = L3 CI 再検証）§Decision.3.②（第2段）の実装。

## Layers

- **domain**
  - `AttestationReference` / `AttestationScopeEvidence` / `AttestationVerificationFinding` / `AttestationVerificationReport`（value-object）。
  - `CoverageAttestationVerificationService`（domain service）: `verify(references, evidence): AttestationVerificationReport`。純粋関数。matrix I/O は持たない（domain 副作用禁止に適合）。INV-A/B/C は domain_model.md 参照。
- **application**
  - `CoverageAttestationVerificationPolicyPort.collect(): Promise<{ references: readonly AttestationReference[]; evidence: AttestationScopeEvidence; matrixError: string | null }>`（domain port）。参照走査（ungated-legacy 免除込み）と matrix 由来 evidence 解決は infra が担う。`matrixError` は参照ありで matrix 読めない fail-closed のシグナル。
  - `RunL3ValidatorsUseCase` に optional `coverageAttestationVerificationPolicyPort` を追加。L3-007 の override ブロックで `collect()` → `matrixError` あれば FAIL（fail-closed）、無ければ `service.verify()` → finding あれば `ValidationResult.fail(L3-007, error findings)`、無ければ `pass`。default-OFF/skip 時は override しない（L3-004/L3-005/L3-006 と同方式）。
- **infrastructure**
  - `FileSystemCoverageAttestationVerificationAdapter`: `docs/product/construction/*/coverage_report.md` を cwd 起点で走査し、ungated-legacy マーカー付きファイルを除外して `<!-- @attestation <id> -->` 参照を抽出する。参照が 1 件以上ある場合のみ matrix（config `layers.L3.requirementMatrixPath`、既定 `.harness/requirement-test-matrix.json`）を読み、resolvable scope（storyId 存在 かつ testReferences >= 1）を解決する。matrix 不在・parse 不能時は `matrixError` を返す（参照 0 件なら matrix を読まず `references: [], evidence: 空, matrixError: null`）。
- **presentation**: 既存 `RunValidatorsHandler` は無変更（override は usecase 内）。composition-root で port を配線。

## Validator registration

- `ValidatorId` に `'L3-007': 'coverage-attestation-verification'` を追加（VALIDATOR_NAME_MAP）。
- composition-root `buildDefaultRegistry`: `createDef("L3-007", "L3", "always", "CoverageAttestationVerificationPolicyPort")`。
- `DEFAULT_CONFIG.layers.L3.validators` に `"L3-007"` を追加（default-ON）。
- config-foundation `validator-system-config-mapper`: L3 の alias に `"coverage-attestation-verification": "L3-007"` を追加し、L3-006 と同じ force-include パターンで `includeValidator(..., "L3-007")`（fallback 後に必ず含める。fail-closed だが現 corpus は参照 0 件ゆえ緑）。
- composition-root: `new FileSystemCoverageAttestationVerificationAdapter(process.cwd(), matrixFilePath)` を `runL3ValidatorsUseCase` に配線。

## 突合 vs 再実行の設計判断

CI は `phasegate:ci-check` 前段で `pnpm test` 全実行 + `phasegate:generate-matrix` を走らせるため、attestation が指すテストを個別に再実行するのは二重実行になる。代わりに「attestation id が本ランのテスト corpus から再生成された matrix 上に実在し、テスト参照を持つ」ことを突合することで、二重実行を避けつつ「空手形の attestation」を authoritative に遮断する。L3-004/L3-005 の matrix 突合パターンの踏襲。

## Anti-laundering rationale

L2-016 は fast-path（bare ✅ の遮断＝参照の形状のみ）。L3-007 はその authoritative 相棒であり、参照が現に tracked なテスト evidence に解決できることを CI で機械検証する。解決不能な参照は fail-closed で FAIL（ADR-030 §Decision.1）。ungated-legacy 免除は L2-016 と一致。
