// @unit attestation
// @layer application

/**
 * ci-check の1バリデータ結果を写す plain DTO（Shared Kernel の型 import は避ける）。
 */
export interface GateValidatorResult {
  readonly validatorId: string;
  readonly passed: boolean;
  readonly skipped: boolean;
}

/**
 * gate 実行結果を取得する調停ポート（application 所有）。
 * black-box observation: 実体は subprocess `phasegate:ci-check --json`（infrastructure）。
 * 集約不変条件に関与しないため domain ではなく application に配置する。
 */
export interface GateResultSourcePort {
  fetchGateResult(): Promise<{
    readonly allPassed: boolean;
    readonly validatorResults: readonly GateValidatorResult[];
  }>;
}
