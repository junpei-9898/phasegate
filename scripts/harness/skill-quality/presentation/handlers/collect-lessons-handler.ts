/**
 * @layer presentation
 * @unit skill-quality
 */
import type { CollectLessonsUseCase } from '../../application/usecases/collect-lessons-usecase.js';
import type { WriteLessonArtifactUseCase } from '../../application/usecases/write-lesson-artifact-usecase.js';

export interface CollectLessonsArgs {
  storyId: string;
  sources: string[];
  writeArtifact?: boolean;
}

export class CollectLessonsHandler {
  constructor(
    private readonly collectUseCase: CollectLessonsUseCase,
    private readonly writeUseCase: WriteLessonArtifactUseCase,
  ) {}

  async handle(args: CollectLessonsArgs): Promise<{ exitCode: number; message: string }> {
    try {
      const collectOutput = await this.collectUseCase.execute({ sources: args.sources });
      let msg = `Collected ${collectOutput.totalCollected} lessons (${collectOutput.deduplicatedCount} duplicates removed)`;

      if (args.writeArtifact) {
        const writeOutput = await this.writeUseCase.execute({
          storyId: args.storyId,
          lessons: collectOutput.lessons,
        });
        msg += `\nArtifact written to: ${writeOutput.outputPath}`;
      }

      return { exitCode: 0, message: msg };
    } catch (err) {
      return { exitCode: err instanceof Error && err.message.includes('schema') ? 1 : 2, message: `Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
