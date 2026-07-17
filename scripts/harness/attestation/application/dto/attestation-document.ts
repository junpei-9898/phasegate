// @unit attestation
// @layer application
// @work-item-id WI-306

/**
 * versioned record formatのplain object表現（logical_design §1.4.3 / WI-306）。
 * ファイル入出力・stdout エコー・mapper の境界で用いる契約型。VO はプリミティブ展開する。
 */
export interface AttestationDocumentValidatorOutcome {
  readonly validatorId: string;
  readonly passed: boolean;
  readonly skipped: boolean;
}

export interface AttestationDocumentSource {
  readonly path: string;
  readonly digest: string;
}

export interface AttestationDocumentGranularityClaim {
  readonly validator: string;
  readonly level: "file" | "ac";
  readonly claim: string;
  readonly knownLimitations: string[];
}

interface AttestationDocumentBase {
  readonly subject: {
    readonly command: string;
    readonly gateResult: "pass" | "fail";
    readonly validatorSet: AttestationDocumentValidatorOutcome[];
  };
  readonly inputs: {
    readonly digestAlgorithm: "sha256";
    readonly sources: AttestationDocumentSource[];
    readonly inputDigest: string;
  };
  readonly granularity: {
    readonly traceability: AttestationDocumentGranularityClaim;
  };
  /** H16-03: 実際に ac-bound かつ L3-005 スコープ内で pass した story-id（昇順）。 */
  readonly acBoundScope: string[];
  readonly metadata: {
    readonly producedAt: string;
    readonly producer: string;
    readonly gitCommit: string | null;
  };
  readonly signature: {
    readonly mode: "unsigned-poc" | "signed";
    readonly attestationDigest: string;
    readonly algorithm: string | null;
    readonly keyId: string | null;
    readonly value: string | null;
  };
}

export interface AttestationDocumentV1 extends AttestationDocumentBase {
  readonly schemaVersion: "phasegate-attestation/v1";
  readonly predicateType: "https://phasegate.dev/attestation/gate-run/v1";
}

export interface AttestationDocumentV2 extends AttestationDocumentBase {
  readonly schemaVersion: "phasegate-attestation/v2";
  readonly predicateType: "https://phasegate.dev/attestation/gate-run/v2";
  /** 実行時のWorld canonical corpusRoot。個別fragment digestは保持しない。 */
  readonly worldSnapshotRoot: string;
}

export type AttestationDocument = AttestationDocumentV1 | AttestationDocumentV2;
