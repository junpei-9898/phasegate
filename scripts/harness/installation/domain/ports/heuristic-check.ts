// @unit installation
// @layer domain
// @work-item-id WI-145

import type { FileInspectorPort } from "../../application/ports/file-inspector-port.js";
import type { CheckId } from "../check-id.js";
import type { DiagnosticFinding } from "../diagnostic-finding.js";

export interface HeuristicCheck {
  readonly checkId: CheckId;
  run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null>;
}
