/**
 * @unit skill-quality
 * Composition Root - wires all dependencies together
 */

// Domain Services
import { AtomicCommitService } from './domain/services/atomic-commit-service.js';
import { LessonCollector } from './domain/services/lesson-collector.js';
import { LessonDeduplicator } from './domain/services/lesson-deduplicator.js';
import { CascadeUpdateService } from './domain/services/cascade-update-service.js';
import { SkillStructureValidator } from './domain/services/skill-structure-validator.js';

// Infrastructure Adapters
import { GitCommitExecutorAdapter } from './infrastructure/adapters/git-commit-executor-adapter.js';
import { L1BiomeValidatorAdapter } from './infrastructure/adapters/l1-biome-validator-adapter.js';
import { L2ValidatorSystemAdapter } from './infrastructure/adapters/l2-validator-system-adapter.js';
import { FileSystemLessonSourceReaderAdapter } from './infrastructure/adapters/file-system-lesson-source-reader-adapter.js';
import { FileSystemLessonArtifactWriterAdapter } from './infrastructure/adapters/file-system-lesson-artifact-writer-adapter.js';
import { AjvLessonArtifactSchemaAdapter } from './infrastructure/adapters/ajv-lesson-artifact-schema-adapter.js';
import { FileSystemRequirementTestMatrixAdapter } from './infrastructure/adapters/file-system-requirement-test-matrix-adapter.js';
import { ValidatorIdRegistryBridgeAdapter } from './infrastructure/adapters/validator-id-registry-bridge-adapter.js';
import { HarnessConfigQueryAdapter } from './infrastructure/adapters/harness-config-query-adapter.js';
import { VitestCoverageRunnerAdapter } from './infrastructure/adapters/vitest-coverage-runner-adapter.js';
import { FileSystemSkillFileReaderAdapter } from './infrastructure/adapters/file-system-skill-file-reader-adapter.js';

// Application Use Cases
import { ExecuteTddCycleUseCase } from './application/usecases/execute-tdd-cycle-usecase.js';
import { CheckCoverageUseCase } from './application/usecases/check-coverage-usecase.js';
import { RunPlanCheckerLoopUseCase } from './application/usecases/run-plan-checker-loop-usecase.js';
import { CollectLessonsUseCase } from './application/usecases/collect-lessons-usecase.js';
import { WriteLessonArtifactUseCase } from './application/usecases/write-lesson-artifact-usecase.js';
import { ApplyCascadeUpdateUseCase } from './application/usecases/apply-cascade-update-usecase.js';
import { ValidateSkillStructureUseCase } from './application/usecases/validate-skill-structure-usecase.js';

// Presentation Handlers
import { ExecuteTddCycleHandler } from './presentation/handlers/execute-tdd-cycle-handler.js';
import { CheckCoverageHandler } from './presentation/handlers/check-coverage-handler.js';
import { RunPlanCheckerLoopHandler } from './presentation/handlers/run-plan-checker-loop-handler.js';
import { CollectLessonsHandler } from './presentation/handlers/collect-lessons-handler.js';
import { ApplyCascadeUpdateHandler } from './presentation/handlers/apply-cascade-update-handler.js';
import { ValidateSkillStructureHandler } from './presentation/handlers/validate-skill-structure-handler.js';

// Adapter for file system (used in ApplyCascadeUpdateUseCase)
import type { FileSystemPort } from './domain/ports/file-system-port.js';

class NodeFileSystemAdapter implements FileSystemPort {
  async read(filePath: string): Promise<string> {
    const { readFile } = await import('node:fs/promises');
    return readFile(filePath, 'utf-8');
  }
  async write(filePath: string, content: string): Promise<void> {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, content, 'utf-8');
  }
  async glob(pattern: string): Promise<readonly string[]> {
    const { glob } = await import('tinyglobby');
    return glob(pattern, { onlyFiles: true });
  }
}

export function createSkillQualityHandlers() {
  // Infrastructure
  const commitExecutorPort = new GitCommitExecutorAdapter();
  const l1ValidatorPort = new L1BiomeValidatorAdapter();
  const l2ValidatorPort = new L2ValidatorSystemAdapter();
  const lessonSourceReaderPort = new FileSystemLessonSourceReaderAdapter();
  const lessonArtifactWriterPort = new FileSystemLessonArtifactWriterAdapter();
  const lessonArtifactSchemaPort = new AjvLessonArtifactSchemaAdapter();
  const requirementTestMatrixPort = new FileSystemRequirementTestMatrixAdapter();
  const validatorIdRegistryPort = new ValidatorIdRegistryBridgeAdapter();
  const configQueryPort = new HarnessConfigQueryAdapter();
  const coverageRunnerPort = new VitestCoverageRunnerAdapter();
  const skillFileReaderPort = new FileSystemSkillFileReaderAdapter();
  const fileSystemPort = new NodeFileSystemAdapter();

  // Domain Services
  const atomicCommitService = new AtomicCommitService(commitExecutorPort, l1ValidatorPort, l2ValidatorPort);
  const lessonCollector = new LessonCollector(lessonSourceReaderPort);
  const lessonDeduplicator = new LessonDeduplicator();
  const cascadeUpdateService = new CascadeUpdateService(validatorIdRegistryPort, configQueryPort);
  const skillStructureValidator = new SkillStructureValidator(skillFileReaderPort);

  // Use Cases
  const executeTddCycleUseCase = new ExecuteTddCycleUseCase(atomicCommitService);
  const checkCoverageUseCase = new CheckCoverageUseCase(requirementTestMatrixPort, coverageRunnerPort, configQueryPort);
  const runPlanCheckerLoopUseCase = new RunPlanCheckerLoopUseCase(
    {
      evaluate: async (planDocument: string) => {
        // チェックボックス形式（- [x] / - [ ]）でカバレッジを評価する
        const checked = (planDocument.match(/- \[x\]/gi) ?? []).length;
        const unchecked = (planDocument.match(/- \[ \]/gi) ?? []).length;
        const total = checked + unchecked;
        if (total === 0) {
          return { coverageRate: 0, gaps: ['プランドキュメントにチェックボックスが見つかりません'], revision: 'N/A' };
        }
        const coverageRate = Math.round((checked / total) * 100);
        const gaps = planDocument
          .split('\n')
          .filter((line) => /- \[ \]/.test(line))
          .map((line) => line.replace(/^.*- \[ \]\s*/, '').trim())
          .filter(Boolean);
        return { coverageRate, gaps, revision: `${checked}/${total}` };
      },
    }
  );
  const collectLessonsUseCase = new CollectLessonsUseCase(lessonCollector, lessonDeduplicator, configQueryPort);
  const writeLessonArtifactUseCase = new WriteLessonArtifactUseCase(lessonArtifactSchemaPort, lessonArtifactWriterPort);
  const applyCascadeUpdateUseCase = new ApplyCascadeUpdateUseCase(cascadeUpdateService, fileSystemPort);
  const validateSkillStructureUseCase = new ValidateSkillStructureUseCase(skillStructureValidator);

  // Handlers
  return {
    executeTddCycleHandler: new ExecuteTddCycleHandler(executeTddCycleUseCase),
    checkCoverageHandler: new CheckCoverageHandler(checkCoverageUseCase),
    runPlanCheckerLoopHandler: new RunPlanCheckerLoopHandler(runPlanCheckerLoopUseCase),
    collectLessonsHandler: new CollectLessonsHandler(collectLessonsUseCase, writeLessonArtifactUseCase),
    applyCascadeUpdateHandler: new ApplyCascadeUpdateHandler(applyCascadeUpdateUseCase),
    validateSkillStructureHandler: new ValidateSkillStructureHandler(validateSkillStructureUseCase),
  };
}
