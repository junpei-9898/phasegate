// @unit world-model
// @layer application
// @work-item-id WI-296

import { ConstraintRecord } from "../../domain/entities/constraint-record.js";
import type { Snapshot } from "../../domain/entities/snapshot.js";
import { NodePin } from "../../domain/value-objects/node-pin.js";
import { WorldNodeId } from "../../domain/value-objects/world-node-id.js";
import type {
  ConstraintDeclarationRepositoryPort,
  ConstraintDeclarationSet,
  WorldControlDiagnosticDto,
} from "../ports/world-control-declaration-repository-port.js";
import type { BuildSnapshotContract } from "./build-snapshot-use-case.js";

export type PinEndpointRole = "claimant" | "premise";

export interface PinConstraintEndpointInput {
  readonly constraintId: string;
  readonly endpoint: PinEndpointRole;
  readonly apply: boolean;
}

export type PinConstraintEndpointResult =
  | { readonly status: "preview" | "applied" | "unchanged"; readonly candidate: PinCandidateDto }
  | { readonly status: "domain-failure"; readonly code: string; readonly message: string }
  | { readonly status: "execution-failure"; readonly diagnostics: readonly WorldControlDiagnosticDto[] };

export interface PinCandidateDto {
  readonly constraintId: string;
  readonly endpoint: PinEndpointRole;
  readonly nodeId: string;
  readonly beforeDigest: string;
  readonly afterDigest: string;
  readonly changed: boolean;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const serialize = (set: ConstraintDeclarationSet, replacement: ConstraintRecord): unknown => ({
  schemaVersion: set.schemaVersion,
  constraints: set.records
    .map((record) => (record.constraintId.equals(replacement.constraintId) ? replacement : record))
    .sort((left, right) => compareStrings(left.constraintId.toString(), right.constraintId.toString()))
    .map((record) => ({
      constraintId: record.constraintId.toString(),
      factType: record.factType,
      claimant: record.claimant.toCanonicalValue(),
      premise: record.premise.toCanonicalValue(),
      applicableRuleIds: record.applicableRuleIds.map((ruleId) => ruleId.toString()),
    })),
  aliases: set.aliases
    .map((alias) => ({ from: alias.from.toString(), to: alias.to.toString() }))
    .sort((left, right) => compareStrings(left.from, right.from)),
});

const resolveNode = (snapshot: Snapshot, set: ConstraintDeclarationSet, nodeId: WorldNodeId) => {
  const duplicate = snapshot.extractionDiagnostics.some(
    (diagnostic) => diagnostic.code === "duplicate-node-id" && diagnostic.nodeId?.equals(nodeId),
  );
  if (duplicate) return { ok: false as const, code: "duplicate-endpoint", message: `duplicate endpoint: ${nodeId}` };
  const exact = snapshot.nodes.filter((node) => node.id.equals(nodeId));
  if (exact.length === 1) return { ok: true as const, node: exact[0] };
  const aliases = set.aliases.filter((alias) => alias.from.equals(nodeId));
  if (aliases.length !== 1 || set.aliases.some((alias) => alias.from.equals(aliases[0]?.to))) {
    return {
      ok: false as const,
      code: aliases.length === 0 ? "missing-endpoint" : "ambiguous-endpoint-alias",
      message: `endpoint cannot be resolved uniquely: ${nodeId}`,
    };
  }
  const targets = snapshot.nodes.filter((node) => node.id.equals(aliases[0].to));
  return targets.length === 1
    ? { ok: true as const, node: targets[0] }
    : {
        ok: false as const,
        code: targets.length === 0 ? "missing-endpoint" : "duplicate-endpoint",
        message: `alias target cannot be resolved uniquely: ${aliases[0].to}`,
      };
};

export class PinConstraintEndpointUseCase {
  constructor(
    private readonly buildSnapshot: BuildSnapshotContract,
    private readonly repository: ConstraintDeclarationRepositoryPort,
  ) {}

  async execute(input: PinConstraintEndpointInput): Promise<PinConstraintEndpointResult> {
    let constraintId: WorldNodeId;
    try {
      constraintId = WorldNodeId.parse(input.constraintId);
      if (constraintId.nodeType !== "constraint") throw new Error("not constraint ID");
    } catch {
      return { status: "domain-failure", code: "invalid-constraint-id", message: input.constraintId };
    }
    const [snapshot, loaded] = await Promise.all([this.buildSnapshot.execute(), this.repository.load()]);
    if (loaded.state === "invalid") return { status: "execution-failure", diagnostics: loaded.diagnostics };
    if (loaded.value.malformedDeclarations.length > 0 || loaded.value.diagnostics.length > 0) {
      return {
        status: "domain-failure",
        code: "malformed-constraint-declaration",
        message: "constraint declarations contain malformed or ambiguous candidates",
      };
    }
    const records = loaded.value.records.filter((record) => record.constraintId.equals(constraintId));
    if (records.length !== 1) {
      return { status: "domain-failure", code: "constraint-not-found", message: input.constraintId };
    }
    const record = records[0];
    const before = input.endpoint === "claimant" ? record.claimant : record.premise;
    const resolved = resolveNode(snapshot, loaded.value, before.nodeId);
    if (!resolved.ok) return { status: "domain-failure", code: resolved.code, message: resolved.message };
    const after = NodePin.create({ nodeId: before.nodeId, contentDigest: resolved.node.contentDigest });
    const replacement = ConstraintRecord.create({
      constraintId: record.constraintId,
      schemaVersion: record.schemaVersion,
      factType: record.factType,
      claimant: input.endpoint === "claimant" ? after : record.claimant,
      premise: input.endpoint === "premise" ? after : record.premise,
      applicableRuleIds: record.applicableRuleIds,
      declarationArtifactId: record.declarationArtifactId,
      declarationLocator: record.declarationLocator,
    });
    const candidate = Object.freeze({
      constraintId: input.constraintId,
      endpoint: input.endpoint,
      nodeId: before.nodeId.toString(),
      beforeDigest: before.contentDigest.toString(),
      afterDigest: after.contentDigest.toString(),
      changed: !before.contentDigest.equals(after.contentDigest),
    });
    if (!input.apply) return { status: "preview", candidate };
    if (!candidate.changed) return { status: "unchanged", candidate };
    const written = await this.repository.replaceAtomically(serialize(loaded.value, replacement));
    return written.state === "written"
      ? { status: "applied", candidate }
      : { status: "execution-failure", diagnostics: written.diagnostics };
  }
}
