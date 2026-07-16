// @unit world-model
// @layer application
// @work-item-id WI-295

import type { CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import type { ConstraintFindingDto } from "../../domain/services/constraint-evaluator.js";
import type { ObligationDerivationService } from "../../domain/services/obligation-derivation-service.js";
import type {
  PolicyInputsDigestDerivation,
  PolicyInputsDigestDeriver,
} from "../../domain/services/policy-inputs-digest-deriver.js";
import type { SnapshotRootDeriver } from "../../domain/services/snapshot-root-deriver.js";
import type { Sha256Digest } from "../../domain/value-objects/sha256-digest.js";
import type { WorldObligationReportDto } from "../dto/world-obligation-report-dto.js";
import type { ObligationReportWriterPort } from "../ports/obligation-report-writer-port.js";
import type {
  AdoptionBaselineRepositoryPort,
  SemanticDebtRepositoryPort,
  WaiverDeclarationRepositoryPort,
  WorldControlDiagnosticDto,
  WorldControlReadResult,
} from "../ports/world-control-declaration-repository-port.js";

export interface DeriveObligationsInput {
  readonly rulesetVersion: string;
  readonly findings: readonly ConstraintFindingDto[];
  readonly corpusRoot: Sha256Digest;
  readonly constraintRoot: Sha256Digest;
  readonly evaluationConfigDigest: Sha256Digest;
  readonly policyAsOfDate: string | null;
  readonly writeReport: boolean;
}

export type ReportPersistenceResult =
  | { readonly state: "not-requested" }
  | { readonly state: "written" }
  | { readonly state: "failed"; readonly message: string };

export type DeriveObligationsResult =
  | {
      readonly status: "derived";
      readonly report: WorldObligationReportDto;
      readonly canonicalBytes: Uint8Array;
      readonly persistence: ReportPersistenceResult;
    }
  | {
      readonly status: "invalid-policy-input";
      readonly diagnostics: readonly WorldControlDiagnosticDto[];
    };

interface Dependencies {
  readonly baselineRepository: AdoptionBaselineRepositoryPort;
  readonly waiverRepository: WaiverDeclarationRepositoryPort;
  readonly semanticDebtRepository: SemanticDebtRepositoryPort;
  readonly policyInputsDigestDeriver: PolicyInputsDigestDeriver;
  readonly evaluationIdDeriver: SnapshotRootDeriver;
  readonly obligationDerivationService: ObligationDerivationService;
  readonly serializer: CanonicalJsonSerializer;
  readonly writer: ObligationReportWriterPort;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const diagnosticsOf = <T>(result: WorldControlReadResult<T>): readonly WorldControlDiagnosticDto[] =>
  result.state === "invalid" ? result.diagnostics : [];

export class DeriveObligationsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(input: DeriveObligationsInput): Promise<DeriveObligationsResult> {
    const [baselineResult, waiverResult, debtResult] = await Promise.all([
      this.dependencies.baselineRepository.load(),
      this.dependencies.waiverRepository.load(),
      this.dependencies.semanticDebtRepository.load(),
    ]);
    const diagnostics = [
      ...diagnosticsOf(baselineResult),
      ...diagnosticsOf(waiverResult),
      ...diagnosticsOf(debtResult),
    ].sort(
      (left, right) =>
        compareStrings(left.code, right.code) ||
        compareStrings(left.path, right.path) ||
        compareStrings(left.locator ?? "", right.locator ?? ""),
    );
    if (baselineResult.state === "invalid" || waiverResult.state === "invalid" || debtResult.state === "invalid") {
      return Object.freeze({
        status: "invalid-policy-input",
        diagnostics: Object.freeze(diagnostics),
      });
    }

    let policy: PolicyInputsDigestDerivation;
    try {
      policy = this.dependencies.policyInputsDigestDeriver.derive({
        baseline: baselineResult.value,
        waivers: waiverResult.value,
        semanticDebts: debtResult.value,
        policyAsOfDate: input.policyAsOfDate,
      });
    } catch (error) {
      return Object.freeze({
        status: "invalid-policy-input",
        diagnostics: Object.freeze([
          {
            code: "invalid-policy-as-of-date",
            path: "world.policyAsOfDate",
            locator: null,
            message: error instanceof Error ? error.message : String(error),
          },
        ]),
      });
    }
    const evaluation = this.dependencies.evaluationIdDeriver.deriveEvaluationId({
      schemaVersion: "phasegate-world-evaluation/v1",
      rulesetVersion: input.rulesetVersion,
      corpusRoot: input.corpusRoot,
      constraintRoot: input.constraintRoot,
      evaluationConfigDigest: input.evaluationConfigDigest,
      policyInputsDigest: policy.digest,
    });
    const report: WorldObligationReportDto = this.dependencies.obligationDerivationService.derive({
      evaluationId: evaluation.evaluationId,
      rulesetVersion: input.rulesetVersion,
      policyInputsDigest: policy.digest,
      findings: input.findings,
      baseline: baselineResult.value,
      waivers: waiverResult.value,
      semanticDebts: debtResult.value,
      policyAsOfDate: policy.resolvedPolicyAsOfDate,
    });
    const canonicalBytes = this.dependencies.serializer.serialize(report);
    let persistence: ReportPersistenceResult = Object.freeze({
      state: "not-requested",
    });
    if (input.writeReport) {
      try {
        await this.dependencies.writer.write(canonicalBytes);
        persistence = Object.freeze({ state: "written" });
      } catch (error) {
        persistence = Object.freeze({
          state: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return Object.freeze({
      status: "derived",
      report,
      canonicalBytes,
      persistence,
    });
  }
}
