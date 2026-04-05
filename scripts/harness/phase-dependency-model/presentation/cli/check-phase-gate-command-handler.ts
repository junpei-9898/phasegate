/**
 * @layer presentation
 * @unit phase-dependency-model
 */

import type { PhaseGateResultDto } from '../../application/dto/phase-gate-result-dto.js';

export interface CheckPhaseGateCommandInput {
  readonly targetLevel: number;
  readonly unitId?: string;
  readonly storyId?: string;
  readonly targetFilePath?: string;
  readonly json?: boolean;
}

export interface CheckPhaseGateCommandOutput {
  readonly exitCode: 0 | 1 | 2;
  readonly result: PhaseGateResultDto | null;
  readonly text: string;
}

export interface CheckPhaseGateCommandHandlerDeps {
  readonly checkPhaseGateUseCase: {
    execute(input: {
      readonly targetLevel: 1 | 2 | 3;
      readonly unitId?: string;
      readonly storyId?: string;
      readonly targetFilePath?: string;
    }): Promise<PhaseGateResultDto>;
  };
}

export class CheckPhaseGateCommandHandler {
  private readonly useCase: CheckPhaseGateCommandHandlerDeps['checkPhaseGateUseCase'];

  constructor(deps: CheckPhaseGateCommandHandlerDeps) {
    this.useCase = deps.checkPhaseGateUseCase;
  }

  async execute(
    input: CheckPhaseGateCommandInput,
  ): Promise<Readonly<CheckPhaseGateCommandOutput>> {
    if (![1, 2, 3].includes(input.targetLevel)) {
      return Object.freeze({
        exitCode: 2,
        result: null,
        text: `Error: invalid target level ${input.targetLevel}. Must be 1, 2, or 3`,
      });
    }

    try {
      const useCaseInput = {
        targetLevel: input.targetLevel as 1 | 2 | 3,
        unitId: input.unitId,
        storyId: input.storyId,
        targetFilePath: input.targetFilePath,
      };

      const result = await this.useCase.execute(useCaseInput);
      const text = input.json
        ? JSON.stringify(result, null, 2)
        : this.formatText(result);

      return Object.freeze({
        exitCode: result.passed ? 0 : 1,
        result,
        text,
      });
    } catch {
      return Object.freeze({
        exitCode: 2,
        result: null,
        text: 'Error: phase gate check failed unexpectedly',
      });
    }
  }

  private formatText(result: PhaseGateResultDto): string {
    const lines: string[] = [];
    const status = result.passed ? 'PASSED' : 'FAILED';
    lines.push(`Phase Gate Level ${result.targetLevel}: ${status}`);

    if (result.blockers.length > 0) {
      lines.push('Blockers:');
      for (const b of result.blockers) {
        lines.push(`  - ${b}`);
      }
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      for (const w of result.warnings) {
        lines.push(`  - ${w}`);
      }
    }

    if (result.auditRecorded) {
      lines.push('(audit recorded)');
    }

    return lines.join('\n');
  }
}
