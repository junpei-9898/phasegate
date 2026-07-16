// @unit world-model
// @layer domain
// @work-item-id WI-287
import type { CanonicalJsonObject } from "../services/canonical-json-serializer.js";
import type { PathKey } from "../value-objects/path-key.js";
import type { WorldNodeId } from "../value-objects/world-node-id.js";

const DIAGNOSTIC_CODE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface ExtractionDiagnosticProps {
  readonly code: string;
  readonly nodeId?: WorldNodeId;
  readonly path?: PathKey;
  readonly line?: number;
  readonly payload?: CanonicalJsonObject;
}

export class InvalidExtractionDiagnosticError extends Error {
  constructor(message: string) {
    super(`Invalid World extraction diagnostic: ${message}`);
    this.name = "InvalidExtractionDiagnosticError";
  }
}

export class ExtractionDiagnostic {
  readonly code: string;
  readonly nodeId?: WorldNodeId;
  readonly path?: PathKey;
  readonly line?: number;
  readonly payload: CanonicalJsonObject;

  private constructor(props: ExtractionDiagnosticProps) {
    this.code = props.code;
    this.nodeId = props.nodeId;
    this.path = props.path;
    this.line = props.line;
    this.payload = Object.freeze({ ...(props.payload ?? {}) });
    Object.freeze(this);
  }

  static create(props: ExtractionDiagnosticProps): ExtractionDiagnostic {
    if (!DIAGNOSTIC_CODE_PATTERN.test(props.code)) {
      throw new InvalidExtractionDiagnosticError(`invalid code "${props.code}"`);
    }
    if (props.line !== undefined && (!Number.isInteger(props.line) || props.line < 1)) {
      throw new InvalidExtractionDiagnosticError(`invalid line "${props.line}"`);
    }
    return new ExtractionDiagnostic(props);
  }

  toCanonicalValue(): CanonicalJsonObject {
    return {
      code: this.code,
      line: this.line ?? null,
      nodeId: this.nodeId?.toString() ?? null,
      pathKey: this.path?.toString() ?? null,
      payload: this.payload,
    };
  }
}
