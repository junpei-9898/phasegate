// @unit world-model
// @layer domain
// @work-item-id WI-294

import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { EvaluationId } from "../value-objects/evaluation-id.js";
import type { Sha256Digest } from "../value-objects/sha256-digest.js";
import type { ViolationFingerprint } from "../value-objects/violation-fingerprint.js";
import type { WcrRuleId } from "../value-objects/wcr-rule-id.js";
import type { WorldNodeId } from "../value-objects/world-node-id.js";

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const WORK_ITEM_PATTERN = /^WI-\d+$/;
const WAIVER_ID_PATTERN = /^pgw:v1:waiver:[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const DEBT_ID_PATTERN = /^pgw:v1:semantic-debt:[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const UNIT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export class InvalidControlDeclarationDomainError extends Error {
  constructor(message: string) {
    super(`Invalid World control declaration: ${message}`);
    this.name = "InvalidControlDeclarationDomainError";
  }
}

const requireNonEmpty = (value: string, field: string): string => {
  if (value.trim().length === 0) throw new InvalidControlDeclarationDomainError(`${field} must be non-empty`);
  return value;
};

const requireWorkItemId = (value: string, field: string): string => {
  if (!WORK_ITEM_PATTERN.test(value)) throw new InvalidControlDeclarationDomainError(`${field} must be WI-<digits>`);
  return value;
};

const requireCalendarDate = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new InvalidControlDeclarationDomainError("expiresOn must be YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new InvalidControlDeclarationDomainError("expiresOn must be a valid calendar date");
  }
  return value;
};

export interface AdoptionBaselineEntryProps {
  readonly violationFingerprint: ViolationFingerprint;
  readonly ruleId: WcrRuleId;
  readonly constraintId: WorldNodeId | null;
}

export class AdoptionBaselineEntry {
  readonly violationFingerprint: ViolationFingerprint;
  readonly ruleId: WcrRuleId;
  readonly constraintId: WorldNodeId | null;

  private constructor(props: AdoptionBaselineEntryProps) {
    this.violationFingerprint = props.violationFingerprint;
    this.ruleId = props.ruleId;
    this.constraintId = props.constraintId;
    Object.freeze(this);
  }

  static create(props: AdoptionBaselineEntryProps): AdoptionBaselineEntry {
    if (props.ruleId.toString() === "WCR-001") {
      throw new InvalidControlDeclarationDomainError("WCR-001 is not adoptable");
    }
    if (props.constraintId !== null && props.constraintId.nodeType !== "constraint") {
      throw new InvalidControlDeclarationDomainError("baseline constraintId must identify a constraint");
    }
    return new AdoptionBaselineEntry(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      constraintId: this.constraintId?.toString() ?? null,
      ruleId: this.ruleId.toString(),
      violationFingerprint: this.violationFingerprint.toString(),
    };
  }
}

export interface AdoptionBaselineProps {
  readonly schemaVersion: string;
  readonly rulesetVersion: string;
  readonly sourceEvaluationId: EvaluationId;
  readonly sourceCorpusRoot: Sha256Digest;
  readonly sourceConstraintRoot: Sha256Digest;
  readonly adoptedByWorkItemId: string;
  readonly adoptionReason: string;
  readonly entries: readonly AdoptionBaselineEntry[];
}

export class AdoptionBaseline {
  readonly schemaVersion: string;
  readonly rulesetVersion: string;
  readonly sourceEvaluationId: EvaluationId;
  readonly sourceCorpusRoot: Sha256Digest;
  readonly sourceConstraintRoot: Sha256Digest;
  readonly adoptedByWorkItemId: string;
  readonly adoptionReason: string;
  readonly entries: readonly AdoptionBaselineEntry[];

  private constructor(props: AdoptionBaselineProps, entries: readonly AdoptionBaselineEntry[]) {
    this.schemaVersion = props.schemaVersion;
    this.rulesetVersion = props.rulesetVersion;
    this.sourceEvaluationId = props.sourceEvaluationId;
    this.sourceCorpusRoot = props.sourceCorpusRoot;
    this.sourceConstraintRoot = props.sourceConstraintRoot;
    this.adoptedByWorkItemId = props.adoptedByWorkItemId;
    this.adoptionReason = props.adoptionReason;
    this.entries = entries;
    Object.freeze(this);
  }

  static create(props: AdoptionBaselineProps): AdoptionBaseline {
    if (props.schemaVersion !== "phasegate-world-adoption-baseline/v1") {
      throw new InvalidControlDeclarationDomainError("unsupported adoption baseline schemaVersion");
    }
    requireNonEmpty(props.rulesetVersion, "rulesetVersion");
    requireWorkItemId(props.adoptedByWorkItemId, "adoptedByWorkItemId");
    requireNonEmpty(props.adoptionReason, "adoptionReason");
    const entries = [...props.entries].sort((left, right) =>
      compareStrings(left.violationFingerprint.toString(), right.violationFingerprint.toString()),
    );
    const fingerprints = entries.map((entry) => entry.violationFingerprint.toString());
    if (new Set(fingerprints).size !== fingerprints.length) {
      throw new InvalidControlDeclarationDomainError("baseline entries contain duplicate violationFingerprint");
    }
    return new AdoptionBaseline(props, Object.freeze(entries));
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      adoptedByWorkItemId: this.adoptedByWorkItemId,
      adoptionReason: this.adoptionReason,
      entries: this.entries.map((entry) => entry.toCanonicalValue()),
      rulesetVersion: this.rulesetVersion,
      schemaVersion: this.schemaVersion,
      sourceConstraintRoot: this.sourceConstraintRoot.toString(),
      sourceCorpusRoot: this.sourceCorpusRoot.toString(),
      sourceEvaluationId: this.sourceEvaluationId.toString(),
    };
  }
}

export interface WorldWaiverProps {
  readonly schemaVersion: string;
  readonly waiverId: string;
  readonly violationFingerprint: ViolationFingerprint;
  readonly reason: string;
  readonly expiresOn: string;
  readonly workItemId: string;
  readonly renewalOf: string | null;
}

export class WorldWaiver {
  readonly schemaVersion: string;
  readonly waiverId: string;
  readonly violationFingerprint: ViolationFingerprint;
  readonly reason: string;
  readonly expiresOn: string;
  readonly workItemId: string;
  readonly renewalOf: string | null;

  private constructor(props: WorldWaiverProps) {
    this.schemaVersion = props.schemaVersion;
    this.waiverId = props.waiverId;
    this.violationFingerprint = props.violationFingerprint;
    this.reason = props.reason;
    this.expiresOn = props.expiresOn;
    this.workItemId = props.workItemId;
    this.renewalOf = props.renewalOf;
    Object.freeze(this);
  }

  static create(props: WorldWaiverProps): WorldWaiver {
    if (props.schemaVersion !== "phasegate-world-waivers/v1") {
      throw new InvalidControlDeclarationDomainError("unsupported waiver schemaVersion");
    }
    if (!WAIVER_ID_PATTERN.test(props.waiverId)) {
      throw new InvalidControlDeclarationDomainError("waiverId is invalid");
    }
    if (props.renewalOf !== null && !WAIVER_ID_PATTERN.test(props.renewalOf)) {
      throw new InvalidControlDeclarationDomainError("renewalOf is invalid");
    }
    requireNonEmpty(props.reason, "reason");
    requireWorkItemId(props.workItemId, "workItemId");
    requireCalendarDate(props.expiresOn);
    return new WorldWaiver(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      expiresOn: this.expiresOn,
      reason: this.reason,
      renewalOf: this.renewalOf,
      schemaVersion: this.schemaVersion,
      violationFingerprint: this.violationFingerprint.toString(),
      waiverId: this.waiverId,
      workItemId: this.workItemId,
    };
  }
}

export interface SemanticDebtDeclarationProps {
  readonly schemaVersion: string;
  readonly debtId: string;
  readonly kind: "semantic";
  readonly title: string;
  readonly reason: string;
  readonly ownerUnit: string;
  readonly introducedByWorkItemId: string;
  readonly references: readonly WorldNodeId[];
}

export class SemanticDebtDeclaration {
  readonly schemaVersion: string;
  readonly debtId: string;
  readonly kind = "semantic" as const;
  readonly title: string;
  readonly reason: string;
  readonly ownerUnit: string;
  readonly introducedByWorkItemId: string;
  readonly references: readonly WorldNodeId[];

  private constructor(props: SemanticDebtDeclarationProps, references: readonly WorldNodeId[]) {
    this.schemaVersion = props.schemaVersion;
    this.debtId = props.debtId;
    this.title = props.title;
    this.reason = props.reason;
    this.ownerUnit = props.ownerUnit;
    this.introducedByWorkItemId = props.introducedByWorkItemId;
    this.references = references;
    Object.freeze(this);
  }

  static create(props: SemanticDebtDeclarationProps): SemanticDebtDeclaration {
    if (props.schemaVersion !== "phasegate-world-debts/v1") {
      throw new InvalidControlDeclarationDomainError("unsupported semantic debt schemaVersion");
    }
    if (!DEBT_ID_PATTERN.test(props.debtId)) {
      throw new InvalidControlDeclarationDomainError("debtId is invalid");
    }
    if (props.kind !== "semantic") throw new InvalidControlDeclarationDomainError("kind must be semantic");
    if (!UNIT_ID_PATTERN.test(props.ownerUnit)) {
      throw new InvalidControlDeclarationDomainError("ownerUnit is invalid");
    }
    requireNonEmpty(props.title, "title");
    requireNonEmpty(props.reason, "reason");
    requireWorkItemId(props.introducedByWorkItemId, "introducedByWorkItemId");
    const references = [...props.references].sort((left, right) => compareStrings(left.toString(), right.toString()));
    const values = references.map((reference) => reference.toString());
    if (new Set(values).size !== values.length) {
      throw new InvalidControlDeclarationDomainError("references must be unique");
    }
    return new SemanticDebtDeclaration(props, Object.freeze(references));
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      debtId: this.debtId,
      introducedByWorkItemId: this.introducedByWorkItemId,
      kind: this.kind,
      ownerUnit: this.ownerUnit,
      reason: this.reason,
      references: this.references.map((reference) => reference.toString()),
      schemaVersion: this.schemaVersion,
      title: this.title,
    };
  }
}
