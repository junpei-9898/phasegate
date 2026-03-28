/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  PhaseGateCheckPort,
  PhaseGateCheckResult,
} from '../../domain/ports/phase-gate-check-port.js';
import {
  FuseWriteScope,
  type FuseWriteScopePathConfig,
} from '../../domain/value-objects/fuse-write-scope.js';

/**
 * L1 required artifacts（phase-dependency-model の DEFAULT_PHASE_NODES に基づく）。
 * {unit} プレースホルダーは unitId で置換される。
 */
const L1_REQUIRED_ARTIFACTS: readonly string[] = [
  'docs/inception/_shared/product_overview_plan.md',
  'docs/product/product_overview.md',
  'docs/inception/_shared/story_writer_plan.md',
  'docs/product/user_stories.md',
  'docs/inception/_shared/story_mapping_plan.md',
  'docs/product/user_story_mapping.md',
  'docs/inception/_shared/unit_design_plan.md',
  'docs/product/units/integration_contract.md',
];

const L1_UNIT_SCOPED_ARTIFACTS: readonly string[] = [
  'docs/product/units/{unit}_unit.md',
];

/**
 * L2 required artifacts（全て {unit} プレースホルダーを含む）。
 */
const L2_REQUIRED_ARTIFACTS: readonly string[] = [
  'docs/inception/{unit}/domain_model_plan.md',
  'docs/product/construction/{unit}/domain_model.md',
  'docs/inception/{unit}/logical_design_plan.md',
  'docs/product/construction/{unit}/logical_design.md',
  'docs/inception/{unit}/it_test_design_plan.md',
  'docs/product/construction/{unit}/it_test_design.md',
  'docs/inception/{unit}/unit_test_design_plan.md',
  'docs/product/construction/{unit}/unit_test_design.md',
  'docs/inception/{unit}/it_test_logic_plan.md',
  'docs/product/construction/{unit}/it_test_logic.md',
  'docs/inception/{unit}/unit_test_logic_plan.md',
  'docs/product/construction/{unit}/unit_test_logic.md',
];

export interface FusePhaseGateCheckAdapterOptions {
  readonly rootDir: string;
  readonly paths: FuseWriteScopePathConfig;
}

export class FusePhaseGateCheckAdapter implements PhaseGateCheckPort {
  private readonly rootDir: string;
  private readonly paths: FuseWriteScopePathConfig;

  constructor(options: FusePhaseGateCheckAdapterOptions) {
    this.rootDir = options.rootDir;
    this.paths = options.paths;
  }

  isWriteAllowed(relativeFilePath: string): PhaseGateCheckResult {
    const scope = FuseWriteScope.fromPath(relativeFilePath, this.paths);

    if (scope === null) {
      return { allowed: true };
    }

    if (scope.level === 1) {
      return { allowed: true };
    }

    const unitId = scope.unitId;
    if (unitId === undefined) {
      return { allowed: true };
    }

    if (scope.level === 2) {
      return this.checkL1Prerequisites(unitId);
    }

    return this.checkL1AndL2Prerequisites(unitId);
  }

  private checkL1Prerequisites(unitId: string): PhaseGateCheckResult {
    const missing = this.findMissingArtifacts(L1_REQUIRED_ARTIFACTS, unitId);
    const missingUnitScoped = this.findMissingArtifacts(L1_UNIT_SCOPED_ARTIFACTS, unitId);
    const allMissing = [...missing, ...missingUnitScoped];

    if (allMissing.length > 0) {
      return {
        allowed: false,
        reason: `L1前提文書が不足: ${allMissing.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  private checkL1AndL2Prerequisites(unitId: string): PhaseGateCheckResult {
    const l1Result = this.checkL1Prerequisites(unitId);
    if (!l1Result.allowed) {
      return l1Result;
    }

    const missing = this.findMissingArtifacts(L2_REQUIRED_ARTIFACTS, unitId);
    if (missing.length > 0) {
      return {
        allowed: false,
        reason: `L2前提文書が不足: ${missing.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  private findMissingArtifacts(
    templates: readonly string[],
    unitId: string,
  ): string[] {
    const missing: string[] = [];
    for (const template of templates) {
      const resolved = template.replaceAll('{unit}', unitId);
      const fullPath = join(this.rootDir, resolved);
      if (!existsSync(fullPath)) {
        missing.push(resolved);
      }
    }
    return missing;
  }
}
