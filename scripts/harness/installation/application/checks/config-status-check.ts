// @unit installation
// @layer application
// @work-item-id WI-330

import type { DiagnosticFinding } from "../../domain/diagnostic-finding.js";
import type { HeuristicCheck } from "../../domain/ports/heuristic-check.js";
import type { ConfigStatusProbePort } from "../ports/config-status-probe-port.js";
import type { FileInspectorPort } from "../ports/file-inspector-port.js";
import { createFinding } from "./check-utils.js";

/**
 * WI-330 (GitHub #40 恒久化): phasegate.config.json の存在・妥当性を doctor で可視化する。
 * - missing        → warn（既定設定の fail-open で動作していることをユーザーに知らせる）
 * - invalid-json / invalid-schema → red（意図した設定が適用されていない）
 * - valid          → finding なし
 */
export class ConfigStatusCheck implements HeuristicCheck {
  readonly checkId = "config-status" as const;

  constructor(private readonly probe: ConfigStatusProbePort) {}

  async run(projectRoot: string, _inspector: FileInspectorPort): Promise<DiagnosticFinding | null> {
    const result = await this.probe.probe(projectRoot);
    if (result.status === "valid") {
      return null;
    }
    if (result.status === "missing") {
      return createFinding({
        checkId: this.checkId,
        severity: "warn",
        target: result.configPath,
        message:
          "phasegate.config.json が存在しません（既定設定の fail-open モードで動作中）。`phasegate init` で生成できます",
        repairMode: "mechanical",
        repairHint: "npx phasegate init",
      });
    }
    const reason = result.status === "invalid-json" ? "JSON 構文エラー" : "スキーマ違反";
    const detail = result.detail !== null && result.detail.length > 0 ? ` — ${result.detail}` : "";
    return createFinding({
      checkId: this.checkId,
      severity: "red",
      target: result.configPath,
      message: `phasegate.config.json が${reason}で壊れており、ユーザーの意図した設定が適用されていません（既定設定の fail-open モードで動作中）${detail}`,
      repairMode: "manual",
      repairHint:
        result.status === "invalid-json"
          ? "phasegate.config.json の JSON 構文エラーを修正するか、version control から復元してください"
          : "報告されたパス・型のスキーマ違反を phasegate.config.json 上で修正するか、version control から復元してください",
    });
  }
}
