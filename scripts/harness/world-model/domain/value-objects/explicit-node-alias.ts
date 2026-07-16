// @unit world-model
// @layer domain
// @work-item-id WI-293

import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { WorldNodeId } from "./world-node-id.js";

export interface ExplicitNodeAliasProps {
  readonly from: WorldNodeId;
  readonly to: WorldNodeId;
}

export class ExplicitNodeAlias {
  readonly from: WorldNodeId;
  readonly to: WorldNodeId;

  private constructor(props: ExplicitNodeAliasProps) {
    this.from = props.from;
    this.to = props.to;
    Object.freeze(this);
  }

  static create(props: ExplicitNodeAliasProps): ExplicitNodeAlias {
    return new ExplicitNodeAlias(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return { from: this.from.toString(), to: this.to.toString() };
  }
}
