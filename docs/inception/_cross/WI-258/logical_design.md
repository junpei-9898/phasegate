# WI-258 Logical Design — coverage-attestation-gating (L2-016)

<!-- @work-item-id WI-258 -->

## Overview

L2-016（coverage-attestation-gating）は `docs/product/construction/*/coverage_report.md` を走査し、attestation 参照の無い ✅ 主張を fail-closed で違反として検出する。`ungated-legacy` マーカー付きファイルは免除するが warning で件数報告する（見える負債）。

## Layers

- **domain**
  - `CoverageReportGatingModel`（value-object）: 1 ファイルの走査結果。`path` / `hasLegacyMarker: boolean` / `claims: CoverageClaim[]`。`CoverageClaim` = `{ lineNumber, hasAttestationRef: boolean }`。
  - `CoverageGatingReport`（value-object）: `violations: CoverageGatingFinding[]` / `legacyCount: number`。`hasViolations()`。
  - `CoverageAttestationGatingService`（domain service）: `check(models: CoverageReportGatingModel[]): CoverageGatingReport`。ルール:
    - `hasLegacyMarker === true` のファイルは violation を出さず `legacyCount++`。
    - それ以外で `claim.hasAttestationRef === false` の各 ✅ claim → violation（fail-closed）。
- **application**
  - `CoverageAttestationGatingPolicyPort.collect(): Promise<readonly CoverageReportGatingModel[]>`（domain port）。走査対象は infra が解決（cwd 起点、targetPaths 非依存）。
  - `RunL2ValidatorsUseCase` に optional `coverageAttestationGatingPolicyPort` を追加。L2-016 の override ブロックで `collect()` → service.check → violation あれば `ValidationResult.fail(L2-016)`、無ければ `pass`。warning（legacyCount）は fail でも pass でも finding として付与（severity=warning）。
- **infrastructure**
  - `FileSystemCoverageAttestationGatingAdapter`: `docs/product/construction/*/coverage_report.md` を glob（`process.cwd()` 起点）し、各ファイルを読んで model 化。
    - legacy マーカー検出: 先頭付近（本文開始前）の `<!-- @coverage-gating: ungated-legacy -->`。
    - ✅ claim 検出: `✅` を含む行を claim とみなす。同一行に `<!-- @attestation ... -->` があるか、直前の連続コメント行に `@attestation` があれば `hasAttestationRef=true`。
- **presentation**: 既存 `RunValidatorsHandler` を変更せず（override は usecase 内）。composition-root で port を配線。

## Validator registration

- `ValidatorId` に `'L2-016': 'coverage-attestation-gating'` を追加。
- composition-root `buildDefaultRegistry`: `createDef("L2-016", "L2", "always", "CoverageAttestationGatingPolicyPort")`。
- `DEFAULT_CONFIG.layers.L2.validators` に `"L2-016"` を追加（default-ON）。
- composition-root: `new FileSystemCoverageAttestationGatingAdapter(process.cwd())` を `runL2ValidatorsUseCase` に配線。

## Anti-laundering rationale

L2 は「bare ✅（参照なし）を書くだけで通る」経路を遮断する第一防壁。attestation レコードとの authoritative 突合は ADR-030 §Decision.3.② に従い L3 が担う（本 WI 対象外）。
