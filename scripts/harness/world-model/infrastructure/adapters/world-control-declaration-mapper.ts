// @unit world-model
// @layer infrastructure
// @work-item-id WI-294

import type {
  ConstraintDeclarationSet,
  WorldControlDiagnosticDto,
} from "../../application/ports/world-control-declaration-repository-port.js";
import {
  type ConstraintFactType,
  ConstraintRecord,
  MalformedConstraintDeclaration,
} from "../../domain/entities/constraint-record.js";
import {
  AdoptionBaseline,
  AdoptionBaselineEntry,
  SemanticDebtDeclaration,
  WorldWaiver,
} from "../../domain/entities/control-declarations.js";
import { EvaluationId } from "../../domain/value-objects/evaluation-id.js";
import { ExplicitConstraintRelation } from "../../domain/value-objects/explicit-constraint-relation.js";
import { ExplicitNodeAlias } from "../../domain/value-objects/explicit-node-alias.js";
import { NodePin } from "../../domain/value-objects/node-pin.js";
import { Sha256Digest } from "../../domain/value-objects/sha256-digest.js";
import { ViolationFingerprint } from "../../domain/value-objects/violation-fingerprint.js";
import { WcrRuleId } from "../../domain/value-objects/wcr-rule-id.js";
import { WorldNodeId } from "../../domain/value-objects/world-node-id.js";

const CONSTRAINT_SCHEMA = "phasegate-world-constraints/v1" as const;
const BASELINE_SCHEMA = "phasegate-world-adoption-baseline/v1";
const WAIVER_SCHEMA = "phasegate-world-waivers/v1";
const DEBT_SCHEMA = "phasegate-world-debts/v1";
const FACT_TYPES: readonly ConstraintFactType[] = ["references", "depends-on", "refines", "content-equals"];
const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export class InvalidControlDeclarationError extends Error {
  constructor(message: string) {
    super(`Invalid World control declaration: ${message}`);
    this.name = "InvalidControlDeclarationError";
  }
}

const objectAt = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidControlDeclarationError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
};

const arrayAt = (value: unknown, field: string): readonly unknown[] => {
  if (!Array.isArray(value)) throw new InvalidControlDeclarationError(`${field} must be an array`);
  return value;
};

const stringAt = (value: unknown, field: string): string => {
  if (typeof value !== "string") throw new InvalidControlDeclarationError(`${field} must be a string`);
  return value;
};

const nullableStringAt = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  return stringAt(value, field);
};

const exactKeys = (record: Record<string, unknown>, keys: readonly string[], field: string): void => {
  const actual = Object.keys(record).sort(compareStrings);
  const expected = [...keys].sort(compareStrings);
  const missing = expected.filter((key) => !(key in record));
  const unsupported = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0 || unsupported.length > 0) {
    throw new InvalidControlDeclarationError(
      `${field} fields are invalid (missing=${missing.join(",") || "none"}; unsupported=${unsupported.join(",") || "none"})`,
    );
  }
};

const withField = <T>(field: string, operation: () => T): T => {
  try {
    return operation();
  } catch (error) {
    if (error instanceof InvalidControlDeclarationError) throw error;
    throw new InvalidControlDeclarationError(`${field}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const parsePin = (value: unknown, field: string): NodePin => {
  const record = objectAt(value, field);
  exactKeys(record, ["nodeId", "contentDigest"], field);
  return NodePin.create({
    nodeId: withField(`${field}.nodeId`, () => WorldNodeId.parse(stringAt(record.nodeId, `${field}.nodeId`))),
    contentDigest: withField(`${field}.contentDigest`, () =>
      Sha256Digest.create(stringAt(record.contentDigest, `${field}.contentDigest`)),
    ),
  });
};

const malformed = (
  artifactId: WorldNodeId,
  locator: string,
  declaredConstraintId: string | undefined,
  reason: string,
): MalformedConstraintDeclaration =>
  MalformedConstraintDeclaration.create({
    declaredConstraintId,
    declarationArtifactId: artifactId,
    declarationLocator: locator,
    reasons: [reason],
  });

const parseConstraint = (value: unknown, index: number, artifactId: WorldNodeId): ConstraintRecord => {
  const field = `/constraints/${index}`;
  const record = objectAt(value, field);
  exactKeys(record, ["constraintId", "factType", "claimant", "premise", "applicableRuleIds"], field);
  const factType = stringAt(record.factType, `${field}/factType`);
  if (!FACT_TYPES.includes(factType as ConstraintFactType)) {
    throw new InvalidControlDeclarationError(`${field}/factType is unsupported`);
  }
  return ConstraintRecord.create({
    constraintId: withField(`${field}/constraintId`, () =>
      WorldNodeId.parse(stringAt(record.constraintId, `${field}/constraintId`)),
    ),
    schemaVersion: CONSTRAINT_SCHEMA,
    factType: factType as ConstraintFactType,
    claimant: parsePin(record.claimant, `${field}.claimant`),
    premise: parsePin(record.premise, `${field}.premise`),
    applicableRuleIds: arrayAt(record.applicableRuleIds, `${field}/applicableRuleIds`).map((ruleId, ruleIndex) => {
      const parsed = withField(`${field}/applicableRuleIds/${ruleIndex}`, () =>
        WcrRuleId.create(stringAt(ruleId, "ruleId")),
      );
      if (parsed.toString() === "WCR-001") {
        throw new InvalidControlDeclarationError(`${field}/applicableRuleIds cannot contain admission rule WCR-001`);
      }
      return parsed;
    }),
    declarationArtifactId: artifactId,
    declarationLocator: field,
  });
};

const duplicateValues = (values: readonly (string | null)[]): ReadonlySet<string> => {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value));
};

const diagnostic = (code: string, locator: string | null, message: string): WorldControlDiagnosticDto =>
  Object.freeze({ code, path: "phasegate.world-constraints.json", locator, message });

export function mapConstraintDeclarationDocument(
  value: unknown,
  declarationArtifactId: WorldNodeId,
): ConstraintDeclarationSet {
  const document = objectAt(value, "document");
  exactKeys(document, ["schemaVersion", "constraints", "aliases"], "document");
  if (stringAt(document.schemaVersion, "schemaVersion") !== CONSTRAINT_SCHEMA) {
    throw new InvalidControlDeclarationError("unsupported constraints schemaVersion");
  }
  const rawConstraints = arrayAt(document.constraints, "constraints");
  const candidateIds = rawConstraints.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return null;
    return typeof (candidate as Record<string, unknown>).constraintId === "string"
      ? ((candidate as Record<string, unknown>).constraintId as string)
      : null;
  });
  const duplicateConstraintIds = duplicateValues(candidateIds);
  const records: ConstraintRecord[] = [];
  const malformedDeclarations: MalformedConstraintDeclaration[] = [];
  for (const [index, candidate] of rawConstraints.entries()) {
    const locator = `/constraints/${index}`;
    const declaredConstraintId = candidateIds[index] ?? undefined;
    if (declaredConstraintId !== undefined && duplicateConstraintIds.has(declaredConstraintId)) {
      malformedDeclarations.push(
        malformed(
          declarationArtifactId,
          locator,
          declaredConstraintId,
          `duplicate constraintId ${declaredConstraintId}`,
        ),
      );
      continue;
    }
    try {
      records.push(parseConstraint(candidate, index, declarationArtifactId));
    } catch (error) {
      malformedDeclarations.push(
        malformed(
          declarationArtifactId,
          locator,
          declaredConstraintId,
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  const rawAliases = arrayAt(document.aliases, "aliases");
  const aliasSources = rawAliases.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return null;
    return typeof (candidate as Record<string, unknown>).from === "string"
      ? ((candidate as Record<string, unknown>).from as string)
      : null;
  });
  const duplicateAliasSources = duplicateValues(aliasSources);
  const aliases: ExplicitNodeAlias[] = [];
  const diagnostics: WorldControlDiagnosticDto[] = [];
  for (const [index, candidate] of rawAliases.entries()) {
    const locator = `/aliases/${index}`;
    const source = aliasSources[index];
    if (source !== null && duplicateAliasSources.has(source)) continue;
    try {
      const record = objectAt(candidate, locator);
      exactKeys(record, ["from", "to"], locator);
      aliases.push(
        ExplicitNodeAlias.create({
          from: WorldNodeId.parse(stringAt(record.from, `${locator}/from`)),
          to: WorldNodeId.parse(stringAt(record.to, `${locator}/to`)),
        }),
      );
    } catch (error) {
      diagnostics.push(
        diagnostic("malformed-alias-declaration", locator, error instanceof Error ? error.message : String(error)),
      );
    }
  }
  for (const source of [...duplicateAliasSources].sort(compareStrings)) {
    diagnostics.push(diagnostic("duplicate-alias-source", null, `No winner for duplicate alias source ${source}`));
  }
  for (const constraintId of [...duplicateConstraintIds].sort(compareStrings)) {
    diagnostics.push(
      diagnostic("duplicate-constraint-id", null, `No winner for duplicate constraint ID ${constraintId}`),
    );
  }

  records.sort((left, right) => compareStrings(left.constraintId.toString(), right.constraintId.toString()));
  aliases.sort((left, right) => compareStrings(left.from.toString(), right.from.toString()));
  malformedDeclarations.sort((left, right) => compareStrings(left.declarationLocator, right.declarationLocator));
  diagnostics.sort((left, right) => compareStrings(left.code, right.code));
  const relations = records
    .filter((record) => record.factType !== "content-equals")
    .map((record) =>
      ExplicitConstraintRelation.create({
        constraintId: record.constraintId,
        factType: record.factType,
        claimantId: record.claimant.nodeId,
        premiseId: record.premise.nodeId,
      }),
    );
  return Object.freeze({
    schemaVersion: CONSTRAINT_SCHEMA,
    records: Object.freeze(records),
    malformedDeclarations: Object.freeze(malformedDeclarations),
    aliases: Object.freeze(aliases),
    relations: Object.freeze(relations),
    diagnostics: Object.freeze(diagnostics),
  });
}

export function mapAdoptionBaselineDocument(value: unknown): AdoptionBaseline {
  try {
    const document = objectAt(value, "document");
    exactKeys(
      document,
      [
        "schemaVersion",
        "rulesetVersion",
        "sourceEvaluationId",
        "sourceCorpusRoot",
        "sourceConstraintRoot",
        "adoptedByWorkItemId",
        "adoptionReason",
        "entries",
      ],
      "document",
    );
    if (stringAt(document.schemaVersion, "schemaVersion") !== BASELINE_SCHEMA) {
      throw new InvalidControlDeclarationError("unsupported adoption baseline schemaVersion");
    }
    const entries = arrayAt(document.entries, "entries").map((value, index) => {
      const field = `/entries/${index}`;
      const entry = objectAt(value, field);
      exactKeys(entry, ["violationFingerprint", "ruleId", "constraintId"], field);
      const constraintIdValue = nullableStringAt(entry.constraintId, `${field}/constraintId`);
      return AdoptionBaselineEntry.create({
        violationFingerprint: ViolationFingerprint.create(
          stringAt(entry.violationFingerprint, `${field}/violationFingerprint`),
        ),
        ruleId: WcrRuleId.create(stringAt(entry.ruleId, `${field}/ruleId`)),
        constraintId: constraintIdValue === null ? null : WorldNodeId.parse(constraintIdValue),
      });
    });
    return AdoptionBaseline.create({
      schemaVersion: BASELINE_SCHEMA,
      rulesetVersion: stringAt(document.rulesetVersion, "rulesetVersion"),
      sourceEvaluationId: EvaluationId.parse(stringAt(document.sourceEvaluationId, "sourceEvaluationId")),
      sourceCorpusRoot: Sha256Digest.create(stringAt(document.sourceCorpusRoot, "sourceCorpusRoot")),
      sourceConstraintRoot: Sha256Digest.create(stringAt(document.sourceConstraintRoot, "sourceConstraintRoot")),
      adoptedByWorkItemId: stringAt(document.adoptedByWorkItemId, "adoptedByWorkItemId"),
      adoptionReason: stringAt(document.adoptionReason, "adoptionReason"),
      entries,
    });
  } catch (error) {
    if (error instanceof InvalidControlDeclarationError) throw error;
    throw new InvalidControlDeclarationError(error instanceof Error ? error.message : String(error));
  }
}

export function mapWaiverDocument(value: unknown): readonly WorldWaiver[] {
  try {
    const document = objectAt(value, "document");
    exactKeys(document, ["schemaVersion", "waivers"], "document");
    if (stringAt(document.schemaVersion, "schemaVersion") !== WAIVER_SCHEMA) {
      throw new InvalidControlDeclarationError("unsupported waiver schemaVersion");
    }
    const waivers = arrayAt(document.waivers, "waivers").map((value, index) => {
      const field = `/waivers/${index}`;
      const waiver = objectAt(value, field);
      exactKeys(waiver, ["waiverId", "violationFingerprint", "reason", "expiresOn", "workItemId", "renewalOf"], field);
      return WorldWaiver.create({
        schemaVersion: WAIVER_SCHEMA,
        waiverId: stringAt(waiver.waiverId, `${field}/waiverId`),
        violationFingerprint: ViolationFingerprint.create(
          stringAt(waiver.violationFingerprint, `${field}/violationFingerprint`),
        ),
        reason: stringAt(waiver.reason, `${field}/reason`),
        expiresOn: stringAt(waiver.expiresOn, `${field}/expiresOn`),
        workItemId: stringAt(waiver.workItemId, `${field}/workItemId`),
        renewalOf: nullableStringAt(waiver.renewalOf, `${field}/renewalOf`),
      });
    });
    const duplicateIds = duplicateValues(waivers.map((waiver) => waiver.waiverId));
    const duplicateFingerprints = duplicateValues(waivers.map((waiver) => waiver.violationFingerprint.toString()));
    if (duplicateIds.size > 0 || duplicateFingerprints.size > 0) {
      throw new InvalidControlDeclarationError("waivers contain duplicate waiverId or violationFingerprint; no winner");
    }
    return Object.freeze(waivers.sort((left, right) => compareStrings(left.waiverId, right.waiverId)));
  } catch (error) {
    if (error instanceof InvalidControlDeclarationError) throw error;
    throw new InvalidControlDeclarationError(error instanceof Error ? error.message : String(error));
  }
}

export function mapSemanticDebtDocument(value: unknown): readonly SemanticDebtDeclaration[] {
  try {
    const document = objectAt(value, "document");
    exactKeys(document, ["schemaVersion", "debts"], "document");
    if (stringAt(document.schemaVersion, "schemaVersion") !== DEBT_SCHEMA) {
      throw new InvalidControlDeclarationError("unsupported semantic debt schemaVersion");
    }
    const debts = arrayAt(document.debts, "debts").map((value, index) => {
      const field = `/debts/${index}`;
      const debt = objectAt(value, field);
      exactKeys(
        debt,
        ["debtId", "kind", "title", "reason", "ownerUnit", "introducedByWorkItemId", "references"],
        field,
      );
      const kind = stringAt(debt.kind, `${field}/kind`);
      if (kind !== "semantic") throw new InvalidControlDeclarationError(`${field}/kind must be semantic`);
      return SemanticDebtDeclaration.create({
        schemaVersion: DEBT_SCHEMA,
        debtId: stringAt(debt.debtId, `${field}/debtId`),
        kind,
        title: stringAt(debt.title, `${field}/title`),
        reason: stringAt(debt.reason, `${field}/reason`),
        ownerUnit: stringAt(debt.ownerUnit, `${field}/ownerUnit`),
        introducedByWorkItemId: stringAt(debt.introducedByWorkItemId, `${field}/introducedByWorkItemId`),
        references: arrayAt(debt.references, `${field}/references`).map((reference, referenceIndex) =>
          WorldNodeId.parse(stringAt(reference, `${field}/references/${referenceIndex}`)),
        ),
      });
    });
    const duplicateIds = duplicateValues(debts.map((debt) => debt.debtId));
    if (duplicateIds.size > 0) {
      throw new InvalidControlDeclarationError("semantic debts contain duplicate debtId; no winner");
    }
    return Object.freeze(debts.sort((left, right) => compareStrings(left.debtId, right.debtId)));
  } catch (error) {
    if (error instanceof InvalidControlDeclarationError) throw error;
    throw new InvalidControlDeclarationError(error instanceof Error ? error.message : String(error));
  }
}
