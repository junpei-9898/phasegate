// @unit installation
// @layer domain
// @work-item-id WI-145
// @work-item-id WI-343

import type { CheckId } from "../check-id.js";
import type { DiagnosticFinding } from "../diagnostic-finding.js";
import type { FileInspector } from "./file-inspector.js";

export interface HeuristicCheckContext {
  readonly installationMode: "project" | "personal";
}

export interface HeuristicCheck {
  readonly checkId: CheckId;
  run(
    projectRoot: string,
    inspector: FileInspector,
    context?: HeuristicCheckContext,
  ): Promise<DiagnosticFinding | null>;
}
