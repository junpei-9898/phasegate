// @unit world-model
// @layer domain
// @work-item-id WI-293

import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { NodePin } from "../value-objects/node-pin.js";
import type { WcrRuleId } from "../value-objects/wcr-rule-id.js";
import type { WorldNodeId } from "../value-objects/world-node-id.js";

export type ConstraintFactType = "references" | "depends-on" | "refines" | "content-equals";

const FACT_TYPES: readonly ConstraintFactType[] = ["references", "depends-on", "refines", "content-equals"];
const SCHEMA_VERSION = "phasegate-world-constraints/v1";
const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export interface ConstraintRecordProps {
  readonly constraintId: WorldNodeId;
  readonly schemaVersion: string;
  readonly factType: ConstraintFactType;
  readonly claimant: NodePin;
  readonly premise: NodePin;
  readonly applicableRuleIds: readonly WcrRuleId[];
  readonly declarationArtifactId: WorldNodeId;
  readonly declarationLocator: string;
}

export class InvalidConstraintRecordError extends Error {
  constructor(message: string) {
    super(`Invalid World constraint record: ${message}`);
    this.name = "InvalidConstraintRecordError";
  }
}

export class ConstraintRecord {
  readonly constraintId: WorldNodeId;
  readonly schemaVersion: string;
  readonly factType: ConstraintFactType;
  readonly claimant: NodePin;
  readonly premise: NodePin;
  readonly applicableRuleIds: readonly WcrRuleId[];
  readonly declarationArtifactId: WorldNodeId;
  readonly declarationLocator: string;

  private constructor(props: ConstraintRecordProps, ruleIds: readonly WcrRuleId[]) {
    this.constraintId = props.constraintId;
    this.schemaVersion = props.schemaVersion;
    this.factType = props.factType;
    this.claimant = props.claimant;
    this.premise = props.premise;
    this.applicableRuleIds = ruleIds;
    this.declarationArtifactId = props.declarationArtifactId;
    this.declarationLocator = props.declarationLocator;
    Object.freeze(this);
  }

  static create(props: ConstraintRecordProps): ConstraintRecord {
    if (props.constraintId.nodeType !== "constraint") {
      throw new InvalidConstraintRecordError("constraintId must be a constraint node ID");
    }
    if (props.schemaVersion !== SCHEMA_VERSION) {
      throw new InvalidConstraintRecordError(`unsupported schemaVersion "${props.schemaVersion}"`);
    }
    if (!FACT_TYPES.includes(props.factType)) {
      throw new InvalidConstraintRecordError(`unsupported factType "${props.factType}"`);
    }
    if (props.applicableRuleIds.length === 0) {
      throw new InvalidConstraintRecordError("applicableRuleIds must be non-empty");
    }
    const sortedRuleIds = [...props.applicableRuleIds].sort((left, right) =>
      compareStrings(left.toString(), right.toString()),
    );
    const uniqueRuleIds = new Set(sortedRuleIds.map((ruleId) => ruleId.toString()));
    if (uniqueRuleIds.size !== sortedRuleIds.length) {
      throw new InvalidConstraintRecordError("applicableRuleIds must be unique");
    }
    if (
      props.declarationArtifactId.nodeType !== "artifact" ||
      !props.declarationArtifactId.toString().startsWith("pgw:v1:artifact:external-declaration:external:")
    ) {
      throw new InvalidConstraintRecordError("declarationArtifactId must identify an external declaration artifact");
    }
    if (props.declarationLocator.trim().length === 0) {
      throw new InvalidConstraintRecordError("declarationLocator must be non-empty");
    }
    return new ConstraintRecord(props, Object.freeze(sortedRuleIds));
  }

  applies(ruleId: string): boolean {
    return this.applicableRuleIds.some((candidate) => candidate.toString() === ruleId);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      applicableRuleIds: this.applicableRuleIds.map((ruleId) => ruleId.toString()),
      claimant: this.claimant.toCanonicalValue(),
      constraintId: this.constraintId.toString(),
      declarationArtifactId: this.declarationArtifactId.toString(),
      declarationLocator: this.declarationLocator,
      factType: this.factType,
      premise: this.premise.toCanonicalValue(),
      schemaVersion: this.schemaVersion,
    };
  }
}

export interface MalformedConstraintDeclarationProps {
  readonly declaredConstraintId?: string;
  readonly declarationArtifactId: WorldNodeId;
  readonly declarationLocator: string;
  readonly reasons: readonly string[];
}

export class MalformedConstraintDeclaration {
  readonly declaredConstraintId: string | null;
  readonly declarationArtifactId: WorldNodeId;
  readonly declarationLocator: string;
  readonly reasons: readonly string[];

  private constructor(props: MalformedConstraintDeclarationProps) {
    this.declaredConstraintId = props.declaredConstraintId ?? null;
    this.declarationArtifactId = props.declarationArtifactId;
    this.declarationLocator = props.declarationLocator;
    this.reasons = Object.freeze([...props.reasons].sort());
    Object.freeze(this);
  }

  static create(props: MalformedConstraintDeclarationProps): MalformedConstraintDeclaration {
    if (
      props.declarationArtifactId.nodeType !== "artifact" ||
      !props.declarationArtifactId.toString().startsWith("pgw:v1:artifact:external-declaration:external:")
    ) {
      throw new InvalidConstraintRecordError("malformed declaration provenance must be an external declaration");
    }
    if (props.declarationLocator.trim().length === 0 || props.reasons.length === 0) {
      throw new InvalidConstraintRecordError("malformed declaration requires locator and reasons");
    }
    return new MalformedConstraintDeclaration(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      declarationArtifactId: this.declarationArtifactId.toString(),
      declarationLocator: this.declarationLocator,
      declaredConstraintId: this.declaredConstraintId,
      reasons: this.reasons,
    };
  }
}
