/**
 * @layer application
 * @unit ci-governance
 *
 * MigrateAgentsMdUseCase - H13-03
 */

import type { LessonArtifactReaderPort } from '../../domain/ports/lesson-artifact-reader-port.js';
import type { AgentsMdPort } from '../../domain/ports/agents-md-port.js';
import type { LessonAggregator } from '../../domain/services/lesson-aggregator.js';
import type { PointerValidator } from '../../domain/services/pointer-validator.js';
import type { MigrateAgentsMdInput } from '../dto/migrate-agents-md-input.js';
import type { MigrateAgentsMdOutput } from '../dto/migrate-agents-md-output.js';

export class MigrateAgentsMdUseCase {
  constructor(
    private readonly lessonArtifactReaderPort: LessonArtifactReaderPort,
    private readonly agentsMdPort: AgentsMdPort,
    private readonly lessonAggregator: LessonAggregator,
    private readonly pointerValidator: PointerValidator,
  ) {}

  async execute(input: MigrateAgentsMdInput): Promise<MigrateAgentsMdOutput> {
    const { dryRun } = input;

    // Phase 1: lesson artifact集約
    const artifacts = await this.lessonArtifactReaderPort.readAll();
    const aggregateResult = this.lessonAggregator.aggregate(artifacts);

    if (!aggregateResult.isOk()) {
      return {
        success: false,
        addedPointers: 0,
        linesBefore: null,
        linesAfter: null,
        kpiMet: null,
        errors: aggregateResult.error,
      };
    }

    const newPointerEntries = aggregateResult.value;

    // Phase 2: AGENTS.md読み取り
    const agentsMdPointer = await this.agentsMdPort.read();

    // PointerEntryを追加
    let updatedPointer = agentsMdPointer;
    for (const entry of newPointerEntries) {
      try {
        updatedPointer = updatedPointer.addPointer(entry);
      } catch {
        updatedPointer = updatedPointer.replacePointer(entry);
      }
    }

    // Dead Pointer検証
    const validationErrors = await this.pointerValidator.validate([...updatedPointer.pointers]);
    if (validationErrors.length > 0) {
      return {
        success: false,
        addedPointers: 0,
        linesBefore: null,
        linesAfter: null,
        kpiMet: null,
        errors: validationErrors,
      };
    }

    if (dryRun) {
      return {
        success: true,
        addedPointers: newPointerEntries.length,
        linesBefore: null,
        linesAfter: null,
        kpiMet: null,
        errors: [],
      };
    }

    // write
    const writeResult = await this.agentsMdPort.write(updatedPointer);

    const kpiMet = writeResult.after <= writeResult.before * 0.5;

    return {
      success: true,
      addedPointers: newPointerEntries.length,
      linesBefore: writeResult.before,
      linesAfter: writeResult.after,
      kpiMet,
      errors: [],
    };
  }
}
