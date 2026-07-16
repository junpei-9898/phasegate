// @unit world-model
// @layer domain
// @work-item-id WI-293

import type { ConstraintFactType } from "../entities/constraint-record.js";
import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { WorldNodeId } from "./world-node-id.js";

export interface ExplicitConstraintRelationProps {
  readonly constraintId: WorldNodeId;
  readonly factType: ConstraintFactType;
  readonly claimantId: WorldNodeId;
  readonly premiseId: WorldNodeId;
}

export class InvalidExplicitConstraintRelationError extends Error {
  constructor(message: string) {
    super(`Invalid explicit World constraint relation: ${message}`);
    this.name = "InvalidExplicitConstraintRelationError";
  }
}

export class ExplicitConstraintRelation {
  readonly constraintId: WorldNodeId;
  readonly factType: ConstraintFactType;
  readonly claimantId: WorldNodeId;
  readonly premiseId: WorldNodeId;

  private constructor(props: ExplicitConstraintRelationProps) {
    this.constraintId = props.constraintId;
    this.factType = props.factType;
    this.claimantId = props.claimantId;
    this.premiseId = props.premiseId;
    Object.freeze(this);
  }

  static create(props: ExplicitConstraintRelationProps): ExplicitConstraintRelation {
    if (props.constraintId.nodeType !== "constraint") {
      throw new InvalidExplicitConstraintRelationError("constraintId must be a constraint node ID");
    }
    return new ExplicitConstraintRelation(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      claimantId: this.claimantId.toString(),
      constraintId: this.constraintId.toString(),
      factType: this.factType,
      premiseId: this.premiseId.toString(),
      source: "constraint-declaration",
    };
  }
}
