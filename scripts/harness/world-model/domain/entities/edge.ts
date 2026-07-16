// @unit world-model
// @layer domain
// @work-item-id WI-287
import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { DeclaredKey } from "../value-objects/declared-key.js";
import type { WorldNodeId } from "../value-objects/world-node-id.js";

export interface EdgeProps {
  readonly edgeType: DeclaredKey;
  readonly from: WorldNodeId;
  readonly to: WorldNodeId;
  readonly qualifier?: CanonicalJsonObject;
}

export class Edge {
  readonly edgeType: DeclaredKey;
  readonly from: WorldNodeId;
  readonly to: WorldNodeId;
  readonly qualifier: CanonicalJsonObject;

  private constructor(props: EdgeProps) {
    this.edgeType = props.edgeType;
    this.from = props.from;
    this.to = props.to;
    this.qualifier = Object.freeze({ ...(props.qualifier ?? {}) });
    Object.freeze(this);
  }

  static create(props: EdgeProps): Edge {
    return new Edge(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      edgeType: this.edgeType.toString(),
      from: this.from.toString(),
      qualifier: this.qualifier,
      to: this.to.toString(),
    };
  }
}
