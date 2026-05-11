// @unit installation
// @layer application
// @work-item-id WI-145

import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import { createFinding, projectPath } from "./check-utils.js";

interface PackageJson {
  readonly name?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

export class PackageJsonDevdepMissingCheck implements HeuristicCheck {
  readonly checkId = "package-json-devdep-missing" as const;
  private readonly target = "package.json";

  async run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const pkg = await inspector.readJson<PackageJson>(projectPath(projectRoot, this.target));
    if (
      pkg?.name === "phasegate" ||
      pkg?.devDependencies?.phasegate !== undefined ||
      pkg?.dependencies?.phasegate !== undefined
    ) {
      return null;
    }
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: this.target,
      message: "package.json の devDependencies に phasegate がありません",
      repairMode: "mechanical",
    });
  }
}
