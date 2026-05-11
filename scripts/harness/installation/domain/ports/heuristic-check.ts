// @unit installation
// @layer domain
// @work-item-id WI-145

import type { CheckId } from "../check-id.js";
import type { DiagnosticFinding } from "../diagnostic-finding.js";
import type { FileInspector } from "./file-inspector.js";

export interface HeuristicCheck {
  readonly checkId: CheckId;
  run(projectRoot: string, inspector: FileInspector): Promise<DiagnosticFinding | null>;
}
