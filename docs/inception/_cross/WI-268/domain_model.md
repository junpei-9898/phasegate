# WI-268 Domain Model — coverage-attestation-verification (L3-007)

<!-- @work-item-id WI-268 -->

## Value Objects

### AttestationReference
coverage_report 内の 1 件の `<!-- @attestation <id> -->` 参照。
- `id: string` — 参照 id（story-id 形式を期待。例 `H05-02`）。
- `sourcePath: string` — 参照を含む coverage_report の project-relative パス。
- `lineNumber: number` — 参照行（1 起点）。

### AttestationScopeEvidence
matrix 由来の「解決可能なスコープ」集合。
- `resolvableScopeIds: ReadonlySet<string>` — matrix 上に存在し、かつ `testReferences` を 1 件以上持つ story-id 集合。

### AttestationVerificationFinding
- `severity: 'error'`
- `sourcePath: string`
- `lineNumber: number`
- `message: string`
- `suggestion: string`

### AttestationVerificationReport
- `findings: readonly AttestationVerificationFinding[]`（error のみ）
- `hasFindings(): boolean`

## Domain Service

### CoverageAttestationVerificationService
`verify(references: readonly AttestationReference[], evidence: AttestationScopeEvidence): AttestationVerificationReport`

不変ルール（anti-laundering / authoritative）:
- **INV-A**: 各 reference について `evidence.resolvableScopeIds` に `reference.id` が含まれなければ error finding を生成する（fail-closed。空手形の attestation を遮断）。
- **INV-B**: `references` が空なら report は空（検査対象なし → PASS）。domain service は matrix 読み込みの成否を知らない（infra 責務）。
- **INV-C**: 全 finding は severity='error'。L3-007 は advisory ではなく blocking tier。

## 判定表

| references | id が resolvableScopeIds に含まれる | 結果 |
|---|---|---|
| なし | — | pass（対象外） |
| あり | すべて含まれる | pass |
| あり | いずれか含まれない | violation (error, fail-closed) |

## 免除・fail-closed の境界（infra 責務）

- `<!-- @coverage-gating: ungated-legacy -->` マーカー付き coverage_report は参照収集の対象外（免除。L2-016 と同一セマンティクス）。
- matrix 不在・parse 不能: 収集した参照が 1 件以上ある場合のみ fail-closed で FAIL（matrix を読めないと解決可能性を否定できないため）。参照が 0 件なら matrix を読みに行かず PASS（最小副作用）。
