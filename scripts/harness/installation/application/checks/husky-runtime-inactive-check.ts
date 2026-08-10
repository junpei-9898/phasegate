// @unit installation
// @layer application
// @work-item-id WI-390

import type { DiagnosticFinding } from '../../domain/diagnostic-finding.js';
import type { GitHooksRuntimeProbe } from '../../domain/ports/git-hooks-runtime-probe.js';
import type { FileInspector } from '../../domain/ports/file-inspector.js';
import type { HeuristicCheck } from '../../domain/ports/heuristic-check.js';
import { createFinding } from './check-utils.js';

export class HuskyRuntimeInactiveCheck implements HeuristicCheck {
  readonly checkId = 'husky-runtime-inactive' as const;

  constructor(private readonly runtimeProbe: GitHooksRuntimeProbe) {}

  async run(projectRoot: string, _inspector: FileInspector): Promise<DiagnosticFinding | null> {
    const state = await this.runtimeProbe.probe(projectRoot);
    if (state.isActive()) return null;

    const detail =
      state.kind === 'unavailable'
        ? `Git hooks runtime を確認できませんでした: ${state.detail ?? 'unknown error'}`
        : `Husky runtime が無効です: reason=${state.reason}, core.hooksPath=${state.hooksPath ?? 'unset'}`;
    return createFinding({
      checkId: this.checkId,
      severity: 'red',
      target: 'core.hooksPath',
      message: detail,
      repairMode: 'mechanical',
      repairHint: 'npx phasegate setup:agent --apply --with-husky',
    });
  }
}
