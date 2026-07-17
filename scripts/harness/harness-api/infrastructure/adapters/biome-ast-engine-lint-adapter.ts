// @layer infrastructure
// biome-ast-engine-lint-adapter.ts — BiomeAstEngineLintAdapter
// Wave 2完了後にリアル実装へ差し替え（旧: @stub: wave2-pending）
// @work-item-id WI-311

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

// Override interface preserved for testing
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

  constructor(stub?: IBiomeAstEngineStub, rootDir = process.cwd()) {
    this.stub = stub ?? BiomeAstEngineLintAdapter.createRealImpl(rootDir);
  }

  private static createRealImpl(rootDir: string): IBiomeAstEngineStub {
    return {
      async runLint(): Promise<BiomeAstEngineResult> {
        const { createBiomeAstEngineModule } = await import('../../../biome-ast-engine/composition-root.js');
        const biomeModule = createBiomeAstEngineModule(rootDir);
        const output = await biomeModule.executeLintUseCase.execute();
        return {
          violations: output.report.violations.map((v) => ({
            filePath: v.filePath.toString(),
            line: v.line,
            column: v.column,
            ruleName: v.ruleName.toString(),
            message: v.message,
            severity: v.severity,
            fix_example: v.fixExample ?? undefined,
          })),
        };
      },
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
