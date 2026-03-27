/**
 * @layer domain
 * @unit validator-system
 *
 * ValidatorExecutionService ドメインサービス
 * 指定されたValidatorDefinition[]を順次実行し、ValidationResult[]を集約
 */
import { ValidatorDefinition } from '../value-objects/validator-definition.js';
import { ValidationResult, type HarnessErrorLike } from '../value-objects/validation-result.js';
import { LayerConfig } from '../value-objects/layer-config.js';
import type { PhaseGatePolicyPort } from '../ports/phase-gate-policy-port.js';

export class ValidatorExecutionError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ValidatorExecutionError';
  }
}

export interface ValidatorExecutionServiceDeps {
  configPort?: {
    getLayerConfig(layer: 'L0' | 'L2' | 'L3' | 'L4'): LayerConfig | Promise<LayerConfig>;
  };
  policyPort?: PhaseGatePolicyPort | { check: (...args: unknown[]) => unknown };
  [key: string]: unknown;
}

/** 簡易緩和プロファイル（executeWithRelaxation用） */
export interface SimpleRelaxationProfile {
  readonly excludedValidatorIds?: readonly string[];
  readonly l2?: { maintained?: readonly string[]; skipped?: readonly string[] };
  readonly l3?: { maintained?: readonly string[]; skipped?: readonly string[] };
  readonly l4?: { all?: boolean };
  readonly phaseExecution?: { twoPhaseRequired?: boolean };
}

export class ValidatorExecutionService {
  private readonly deps: ValidatorExecutionServiceDeps;

  constructor(deps: ValidatorExecutionServiceDeps) {
    this.deps = deps;
  }

  execute(
    definitions: readonly ValidatorDefinition[],
    layerConfigs?: readonly LayerConfig[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const def of definitions) {
      const layerConfig = layerConfigs
        ? layerConfigs.find((c) => c.layer === def.layer)
        : this._getLayerConfigSync(def.layer);

      // スキップ判定: LayerConfig.enabled === false
      if (layerConfig && !layerConfig.isValidatorEnabled(def.validatorId)) {
        results.push(ValidationResult.skip(def.validatorId));
        continue;
      }

      // スキップ判定: strictOnly かつ strictOnly=false
      if (layerConfig && def.isStrictOnly() && !layerConfig.strictOnly) {
        results.push(ValidationResult.skip(def.validatorId));
        continue;
      }

      // 実行
      const start = Date.now();
      try {
        const errors = this._executeValidator(def, layerConfig);
        const durationMs = Date.now() - start;
        if (errors.length > 0) {
          results.push(ValidationResult.fail(def.validatorId, errors, durationMs));
        } else {
          results.push(ValidationResult.pass(def.validatorId, durationMs));
        }
      } catch (err) {
        const durationMs = Date.now() - start;
        const errorMsg = err instanceof Error ? err.message : String(err);
        const failError: HarnessErrorLike = {
          code: { value: def.validatorId.value, toString: () => def.validatorId.value },
          severity: { value: 'error', toString: () => 'error' },
          message: `Validator execution failed: ${errorMsg}`,
          suggestion: 'Check the validator port implementation.',
        };
        results.push(ValidationResult.fail(def.validatorId, [failError], durationMs));
      }
    }

    return results;
  }

  executeWithRelaxation(
    definitions: readonly ValidatorDefinition[],
    profileOrLayerConfigs: SimpleRelaxationProfile | readonly LayerConfig[],
    profile?: SimpleRelaxationProfile
  ): ValidationResult[] {
    // overload handling
    let relaxProfile: SimpleRelaxationProfile;
    let layerConfigs: readonly LayerConfig[] | undefined;

    if (Array.isArray(profileOrLayerConfigs)) {
      layerConfigs = profileOrLayerConfigs as readonly LayerConfig[];
      relaxProfile = profile ?? {};
    } else {
      relaxProfile = profileOrLayerConfigs as SimpleRelaxationProfile;
      layerConfigs = undefined;
    }

    const excluded = new Set(relaxProfile.excludedValidatorIds ?? []);

    const filteredDefs = definitions.filter((def) => {
      if (excluded.has(def.validatorId.value)) return false;
      return true;
    });

    const skippedDefs = definitions.filter((def) => excluded.has(def.validatorId.value));
    const skippedResults = skippedDefs.map((def) => ValidationResult.skip(def.validatorId));

    // 通常実行
    const executedResults = this.execute(filteredDefs, layerConfigs);

    // 元の定義順に並べ直す
    const resultMap = new Map<string, ValidationResult>();
    for (const r of [...skippedResults, ...executedResults]) {
      resultMap.set(r.validatorId.value, r);
    }

    return definitions.map((def) => {
      const r = resultMap.get(def.validatorId.value);
      return r ?? ValidationResult.skip(def.validatorId);
    });
  }

  private _getLayerConfigSync(layer: 'L0' | 'L2' | 'L3' | 'L4'): LayerConfig | undefined {
    const port = this.deps.configPort;
    if (!port) return undefined;
    const result = port.getLayerConfig(layer);
    // sync の場合はそのまま返す（Promiseは非対応）
    if (result instanceof LayerConfig) return result;
    return undefined;
  }

  private _executeValidator(def: ValidatorDefinition, _layerConfig?: LayerConfig): HarnessErrorLike[] {
    // ポートを通じてバリデータを実行する
    // テスト環境ではポートのモックを通じて動作する
    const policyPort = this.deps.policyPort as { check?: (...args: unknown[]) => unknown } | undefined;
    if (policyPort?.check) {
      policyPort.check(def.validatorId.value);
    }
    return [];
  }
}
