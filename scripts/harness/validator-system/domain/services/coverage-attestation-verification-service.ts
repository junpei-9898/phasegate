// @unit validator-system
// @layer domain
// @work-item-id WI-268

/**
 * WI-268 / ADR-030 §Decision.1・§Decision.3.②（第2段） — coverage-attestation-verification
 * (L3-007) の突合ドメインサービス。
 *
 * INV-A: 各 reference の id が evidence.resolvableScopeIds に含まれなければ error finding を生成
 *        （fail-closed。空手形の attestation を遮断）。
 * INV-B: references が空なら report は空（検査対象なし → pass）。
 * INV-C: 生成 finding は必ず severity='error'（advisory ではなく blocking tier）。
 */

import {
  type AttestationReference,
  type AttestationScopeEvidence,
  type AttestationVerificationFinding,
  AttestationVerificationReport,
} from "../value-objects/attestation-verification-report.js";

export class CoverageAttestationVerificationService {
  verify(
    references: readonly AttestationReference[],
    evidence: AttestationScopeEvidence,
  ): AttestationVerificationReport {
    const findings: AttestationVerificationFinding[] = [];

    for (const reference of references) {
      // INV-A: matrix 由来の解決可能スコープに存在しない参照は fail-closed の error。
      if (!evidence.resolvableScopeIds.has(reference.id)) {
        findings.push({
          severity: "error",
          sourcePath: reference.sourcePath,
          lineNumber: reference.lineNumber,
          message: `${reference.sourcePath}:${reference.lineNumber} の @attestation "${reference.id}" は requirement-test-matrix 上のテスト参照に解決できません（空手形 attestation は fail-closed）。`,
          suggestion:
            "@attestation <id> の id を、matrix 上に存在し testReferences を 1 件以上持つ story-id にしてください（phasegate:generate-matrix で最新化）。返済前なら <!-- @coverage-gating: ungated-legacy --> マーカーで免除（負債可視化）すること。",
        });
      }
    }

    return AttestationVerificationReport.create(findings);
  }
}
