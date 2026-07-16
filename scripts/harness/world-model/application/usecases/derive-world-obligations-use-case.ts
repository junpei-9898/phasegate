// @unit world-model
// @layer application
// @work-item-id WI-296, WI-297

import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import type { Snapshot } from "../../domain/entities/snapshot.js";
import { ConstraintEvaluator, type ConstraintFindingDto } from "../../domain/services/constraint-evaluator.js";
import type { SnapshotRootDeriver } from "../../domain/services/snapshot-root-deriver.js";
import { ChangeProvenance } from "../../domain/value-objects/change-provenance.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import type { Sha256Digest } from "../../domain/value-objects/sha256-digest.js";
import type {
  ConstraintDeclarationRepositoryPort,
  WorldControlDiagnosticDto,
} from "../ports/world-control-declaration-repository-port.js";
import type { BuildSnapshotContract } from "./build-snapshot-use-case.js";
import type { DeriveObligationsResult, DeriveObligationsUseCase } from "./derive-obligations-use-case.js";

export interface PolicyDatePort {
  currentUtcDate(): string;
}

export type DeriveWorldObligationsResult =
  | { readonly status: "derived"; readonly result: Extract<DeriveObligationsResult, { status: "derived" }> }
  | { readonly status: "execution-failure"; readonly diagnostics: readonly WorldControlDiagnosticDto[] };

export interface DeriveWorldObligationsInput {
  readonly writeReport: boolean;
  readonly reportPath?: string;
  readonly baselineSnapshot?: Snapshot;
}

interface Dependencies {
  readonly buildSnapshot: BuildSnapshotContract;
  readonly constraintRepository: ConstraintDeclarationRepositoryPort;
  readonly rootDeriver: SnapshotRootDeriver;
  readonly deriveObligations: DeriveObligationsUseCase;
  readonly policyDate: PolicyDatePort;
  readonly constraintConfigDigest: Sha256Digest;
  readonly evaluationConfigDigest: Sha256Digest;
}

const RULESET_VERSION = "phasegate-world-wcr/v1";

export class DeriveWorldObligationsUseCase {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(input: DeriveWorldObligationsInput): Promise<DeriveWorldObligationsResult> {
    const [snapshot, constraints] = await Promise.all([
      this.dependencies.buildSnapshot.execute(),
      this.dependencies.constraintRepository.load(),
    ]);
    if (constraints.state === "invalid") {
      return { status: "execution-failure", diagnostics: constraints.diagnostics };
    }
    const declarationDiagnostics = [
      ...constraints.value.diagnostics.map((item) =>
        ExtractionDiagnostic.create({
          code: item.code,
          path: PathKey.create(item.path),
          payload: { locator: item.locator, message: item.message },
        }),
      ),
      ...constraints.value.malformedDeclarations.map((declaration) =>
        ExtractionDiagnostic.create({
          code: "malformed-constraint-declaration",
          path: PathKey.create("phasegate.world-constraints.json"),
          payload: declaration.toCanonicalValue(),
        }),
      ),
    ];
    const constraintRoot = this.dependencies.rootDeriver.deriveConstraintRoot({
      schemaVersion: constraints.value.schemaVersion,
      rulesetVersion: RULESET_VERSION,
      constraintConfigDigest: this.dependencies.constraintConfigDigest,
      constraints: constraints.value.records.map((record) => ({
        id: record.constraintId,
        value: record.toCanonicalValue(),
      })),
      explicitClaims: [],
      aliases: constraints.value.aliases.map((alias) => ({
        id: alias.from,
        value: alias.toCanonicalValue(),
      })),
      declarationDiagnostics,
    }).root;
    const evaluation = new ConstraintEvaluator().evaluateFull({
      currentSnapshot: snapshot,
      baselineSnapshot: input.baselineSnapshot,
      records: constraints.value.records,
      malformedDeclarations: constraints.value.malformedDeclarations,
      aliases: constraints.value.aliases,
      relations: constraints.value.relations,
      changeProvenance: ChangeProvenance.between(input.baselineSnapshot ?? null, snapshot),
    });
    const implicitFindings = snapshot.extractionDiagnostics.flatMap((diagnostic): readonly ConstraintFindingDto[] => {
      if (diagnostic.code !== "duplicate-node-id" || diagnostic.nodeId === undefined) return [];
      const facts = Array.isArray(diagnostic.payload.candidateFacts) ? diagnostic.payload.candidateFacts : [];
      const digests = facts
        .flatMap((fact) => {
          if (typeof fact !== "string") return [];
          try {
            const parsed = JSON.parse(fact) as { contentDigest?: unknown };
            return typeof parsed.contentDigest === "string" ? [parsed.contentDigest] : [];
          } catch {
            return [];
          }
        })
        .sort();
      return [
        {
          ruleId: "WCR-005",
          constraintId: null,
          factType: null,
          endpoint: null,
          claimant: null,
          premise: null,
          declarationArtifactId: "",
          declarationLocator: "",
          evidence: {
            nodeId: diagnostic.nodeId.toString(),
            candidateCount:
              typeof diagnostic.payload.candidates === "number" ? diagnostic.payload.candidates : digests.length,
            candidateContentDigests: digests,
            resolution: "global-node-id",
          },
        },
      ];
    });
    const result = await this.dependencies.deriveObligations.execute({
      rulesetVersion: RULESET_VERSION,
      findings: [...evaluation.findings, ...implicitFindings],
      corpusRoot: snapshot.corpusRoot,
      constraintRoot,
      evaluationConfigDigest: this.dependencies.evaluationConfigDigest,
      policyAsOfDate: this.dependencies.policyDate.currentUtcDate(),
      writeReport: input.writeReport,
      reportPath: input.reportPath,
    });
    return result.status === "derived"
      ? { status: "derived", result }
      : { status: "execution-failure", diagnostics: result.diagnostics };
  }
}
