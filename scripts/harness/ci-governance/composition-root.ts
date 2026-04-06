/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * Composition Root - 依存性の組み立て
 */

import { TemplateGenerator } from './domain/services/template-generator.js';
import { RepetitionDetector } from './domain/services/repetition-detector.js';
import { PointerValidator } from './domain/services/pointer-validator.js';
import { LessonAggregator } from './domain/services/lesson-aggregator.js';

import { GenerateCiTemplateUseCase } from './application/usecases/generate-ci-template-usecase.js';
import { RenderCiTemplateUseCase } from './application/usecases/render-ci-template-usecase.js';
import { RecordErrorOccurrenceUseCase } from './application/usecases/record-error-occurrence-usecase.js';
import { CheckEscalationUseCase } from './application/usecases/check-escalation-usecase.js';
import { ResetRepetitionUseCase } from './application/usecases/reset-repetition-usecase.js';
import { MigrateAgentsMdUseCase } from './application/usecases/migrate-agents-md-usecase.js';
import { AggregateLessonsUseCase } from './application/usecases/aggregate-lessons-usecase.js';
import { ValidatePointersUseCase } from './application/usecases/validate-pointers-usecase.js';

import { ValidatorIdRegistryAdapter } from './infrastructure/adapters/validator-id-registry-adapter.js';
import { PresetConfigAdapter } from './infrastructure/adapters/preset-config-adapter.js';
import { ErrorRepetitionJsonRepository } from './infrastructure/adapters/error-repetition-json-repository.js';
import { EscalationLogExecutorAdapter } from './infrastructure/adapters/escalation-log-executor-adapter.js';
import { YamlTemplateRendererAdapter } from './infrastructure/adapters/yaml-template-renderer-adapter.js';
import { FileSystemExistenceAdapter } from './infrastructure/adapters/file-system-existence-adapter.js';
import { AgentsMdFileAdapter } from './infrastructure/adapters/agents-md-file-adapter.js';
import { LessonArtifactFileReaderAdapter } from './infrastructure/adapters/lesson-artifact-file-reader-adapter.js';
import { HarnessApiCommandExistenceAdapter } from './infrastructure/adapters/harness-api-command-existence-adapter.js';
import { AdrFoundationExistenceAdapter } from './infrastructure/adapters/adr-foundation-existence-adapter.js';

import { GenerateCiTemplateHandler } from './presentation/handlers/generate-ci-template-handler.js';
import { MigrateAgentsMdHandler } from './presentation/handlers/migrate-agents-md-handler.js';
import { CheckRepetitionHandler } from './presentation/handlers/check-repetition-handler.js';

export interface CiGovernanceCompositionRoot {
  generateCiTemplateHandler: GenerateCiTemplateHandler;
  migrateAgentsMdHandler: MigrateAgentsMdHandler;
  checkRepetitionHandler: CheckRepetitionHandler;
  // Use cases exposed for direct access
  recordErrorOccurrenceUseCase: RecordErrorOccurrenceUseCase;
  checkEscalationUseCase: CheckEscalationUseCase;
  resetRepetitionUseCase: ResetRepetitionUseCase;
  aggregateLessonsUseCase: AggregateLessonsUseCase;
  validatePointersUseCase: ValidatePointersUseCase;
}

export function buildCiGovernance(baseDir: string): CiGovernanceCompositionRoot {
  // Infrastructure adapters
  const validatorIdRegistryAdapter = new ValidatorIdRegistryAdapter();
  const presetConfigAdapter = new PresetConfigAdapter();
  const errorRepetitionRepository = new ErrorRepetitionJsonRepository(baseDir);
  const escalationExecutorPort = new EscalationLogExecutorAdapter();
  const templateRendererPort = new YamlTemplateRendererAdapter();
  const fileExistencePort = new FileSystemExistenceAdapter(baseDir);
  const commandExistencePort = new HarnessApiCommandExistenceAdapter();
  const adrExistencePort = new AdrFoundationExistenceAdapter();
  const agentsMdPort = new AgentsMdFileAdapter(baseDir);
  const lessonArtifactReaderPort = new LessonArtifactFileReaderAdapter(baseDir);

  // Domain services
  const templateGenerator = new TemplateGenerator(validatorIdRegistryAdapter, presetConfigAdapter);
  const repetitionDetector = new RepetitionDetector(errorRepetitionRepository);
  const pointerValidator = new PointerValidator(commandExistencePort, fileExistencePort, adrExistencePort);
  const lessonAggregator = new LessonAggregator();

  // Use cases
  const generateCiTemplateUseCase = new GenerateCiTemplateUseCase(templateGenerator);
  const renderCiTemplateUseCase = new RenderCiTemplateUseCase(templateGenerator, templateRendererPort);
  const recordErrorOccurrenceUseCase = new RecordErrorOccurrenceUseCase(repetitionDetector, escalationExecutorPort);
  const checkEscalationUseCase = new CheckEscalationUseCase(errorRepetitionRepository);
  const resetRepetitionUseCase = new ResetRepetitionUseCase(errorRepetitionRepository);
  const migrateAgentsMdUseCase = new MigrateAgentsMdUseCase(
    lessonArtifactReaderPort,
    agentsMdPort,
    lessonAggregator,
    pointerValidator,
  );
  const aggregateLessonsUseCase = new AggregateLessonsUseCase(lessonArtifactReaderPort, lessonAggregator);
  const validatePointersUseCase = new ValidatePointersUseCase(agentsMdPort, pointerValidator);

  // Handlers
  const generateCiTemplateHandler = new GenerateCiTemplateHandler(
    generateCiTemplateUseCase,
    renderCiTemplateUseCase,
  );
  const migrateAgentsMdHandler = new MigrateAgentsMdHandler(migrateAgentsMdUseCase);
  const checkRepetitionHandler = new CheckRepetitionHandler(checkEscalationUseCase);

  return {
    generateCiTemplateHandler,
    migrateAgentsMdHandler,
    checkRepetitionHandler,
    recordErrorOccurrenceUseCase,
    checkEscalationUseCase,
    resetRepetitionUseCase,
    aggregateLessonsUseCase,
    validatePointersUseCase,
  };
}
