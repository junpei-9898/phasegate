// biome-ast-engine-lint-adapter.ts — BiomeAstEngineLintAdapter
// @stub: wave2-pending - biome-ast-engine の正式インターフェース確定後に差し替え

import type { BiomeLintPort } from '../../domain/ports/biome-lint-port.js';
import type { HarnessError } from '../../domain/value-objects/harness-api-response.js';

interface RuleViolation {
  filePath: string;
  line: number;
  column: number;
  ruleName: string;
  message: string;
  severity: string;
  fix_example?: string;
}

interface BiomeAstEngineResult {
  violations: RuleViolation[];
}

// Stub interface for the external biome-ast-engine module (wave2-pending)
export interface IBiomeAstEngineStub {
  runLint(): Promise<BiomeAstEngineResult>;
}

function violationToHarnessError(v: RuleViolation): HarnessError {
  return {
    code: v.ruleName,
    severity: v.severity,
    message: `${v.message} (${v.filePath}:${v.line}:${v.column})`,
    suggestion: v.fix_example,
  };
}

export class BiomeAstEngineLintAdapter implements BiomeLintPort {
  private readonly stub: IBiomeAstEngineStub;

  constructor(stub?: IBiomeAstEngineStub) {
    this.stub = stub ?? {
      async runLint() { return { violations: [] }; },
    };
  }

  async runLint(): Promise<{ passed: boolean; errors: HarnessError[]; warnings: HarnessError[] }> {
    const result = await this.stub.runLint();
    const errors: HarnessError[] = [];
    const warnings: HarnessError[] = [];

    for (const v of result.violations) {
      const harnessError = violationToHarnessError(v);
      if (v.severity === 'warning') {
        warnings.push(harnessError);
      } else {
        errors.push(harnessError);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }
}
