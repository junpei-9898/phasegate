// @unit validator-system
// @layer domain
// @work-item-id WI-259

import type { InjectionScanTarget } from "../value-objects/injection-scan-report.js";

/**
 * WI-259 / ADR-030 §Decision.3.④ — 指示搭載ファイルの供給ポート。
 * 走査対象（skills/**​/SKILL.md / CLAUDE.md / AGENTS.md / docs/templates/agent-context/** /
 * .claude/settings.json）の解決は infrastructure が担う（cwd 起点・targetPaths 非依存の corpus 走査）。
 */
export interface InjectionScanPolicyPort {
  collect(): Promise<readonly InjectionScanTarget[]>;
}
