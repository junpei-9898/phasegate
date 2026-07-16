// @unit world-model
// @layer domain
// @work-item-id WI-293

import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { Sha256Digest } from "./sha256-digest.js";
import type { WorldNodeId } from "./world-node-id.js";

export interface NodePinProps {
  readonly nodeId: WorldNodeId;
  readonly contentDigest: Sha256Digest;
}

export class NodePin {
  readonly nodeId: WorldNodeId;
  readonly contentDigest: Sha256Digest;

  private constructor(props: NodePinProps) {
    this.nodeId = props.nodeId;
    this.contentDigest = props.contentDigest;
    Object.freeze(this);
  }

  static create(props: NodePinProps): NodePin {
    return new NodePin(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      contentDigest: this.contentDigest.toString(),
      nodeId: this.nodeId.toString(),
    };
  }
}
