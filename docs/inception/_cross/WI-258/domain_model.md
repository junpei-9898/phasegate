# WI-258 Domain Model — coverage-attestation-gating

<!-- @work-item-id WI-258 -->

## Value Objects

### CoverageClaim
1 件の ✅ 主張。
- `lineNumber: number`
- `hasAttestationRef: boolean` — 同一行 or 直前連続コメント行に `@attestation` 参照があるか。

### CoverageReportGatingModel
1 coverage_report ファイルの走査結果。
- `path: string`
- `hasLegacyMarker: boolean` — `<!-- @coverage-gating: ungated-legacy -->` の有無。
- `claims: readonly CoverageClaim[]`

### CoverageGatingFinding
- `severity: 'error' | 'warning'`
- `sourcePath: string`
- `message: string`
- `suggestion: string`

### CoverageGatingReport
- `violations: readonly CoverageGatingFinding[]`（error のみ）
- `warnings: readonly CoverageGatingFinding[]`（legacy 報告）
- `legacyCount: number`
- `hasViolations(): boolean`

## Domain Service

### CoverageAttestationGatingService
`check(models): CoverageGatingReport`

不変ルール（anti-laundering）:
- **INV-A**: `hasLegacyMarker === true` のファイルは error violation を生成しない（免除）が `legacyCount` に計上し warning を 1 件生成する。
- **INV-B**: `hasLegacyMarker === false` のファイルの各 claim について `hasAttestationRef === false` なら error violation を生成する（fail-closed）。
- **INV-C**: claim を持たない（✅ 無し）ファイルは violation も warning も生成しない（対象外）。

## 判定表

| hasLegacyMarker | claims | hasAttestationRef | 結果 |
|---|---|---|---|
| false | あり | true (全て) | pass |
| false | あり | false (いずれか) | violation (error) |
| true | あり/なし | — | 免除 + warning (legacyCount++) |
| false | なし | — | pass（対象外） |
