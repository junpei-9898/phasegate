/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * Composition Root - 依存性の組み立て
 */

import { AggregateLessonsUseCase } from "./application/usecases/aggregate-lessons-usecase.js";
import { CheckAgentContextUseCase } from "./application/usecases/check-agent-context-usecase.js";
import { CheckEscalationUseCase } from "./application/usecases/check-escalation-usecase.js";
import { CreateBaselineUseCase } from "./application/usecases/create-baseline-usecase.js";
import { GenerateCiTemplateUseCase } from "./application/usecases/generate-ci-template-usecase.js";
import { MigrateAgentsMdUseCase } from "./application/usecases/migrate-agents-md-usecase.js";
import { PinIntegrityUseCase } from "./application/usecases/pin-integrity-usecase.js";
import { RecordErrorOccurrenceUseCase } from "./application/usecases/record-error-occurrence-usecase.js";
import { RefreshAgentContextUseCase } from "./application/usecases/refresh-agent-context-usecase.js";
import { RefreshClaudeMdUseCase } from "./application/usecases/refresh-claude-md-usecase.js";
import { RenderCiTemplateUseCase } from "./application/usecases/render-ci-template-usecase.js";
import { ResetRepetitionUseCase } from "./application/usecases/reset-repetition-usecase.js";
import { ScaffoldDesignUseCase } from "./application/usecases/scaffold-design-usecase.js";
import { ValidatePointersUseCase } from "./application/usecases/validate-pointers-usecase.js";
import { VerifyIntegrityUseCase } from "./application/usecases/verify-integrity-usecase.js";
import { ClaudeMdComposer } from "./domain/services/claude-md-composer.js";
import { IntegrityChecker } from "./domain/services/integrity-checker.js";
import { LessonAggregator } from "./domain/services/lesson-aggregator.js";
import { PointerValidator } from "./domain/services/pointer-validator.js";
import { RepetitionDetector } from "./domain/services/repetition-detector.js";
import { TemplateGenerator } from "./domain/services/template-generator.js";
import { AdrFoundationExistenceAdapter } from "./infrastructure/adapters/adr-foundation-existence-adapter.js";
import { AgentContextFileAdapter } from "./infrastructure/adapters/agent-context-file-adapter.js";
import { AgentsMdFileAdapter } from "./infrastructure/adapters/agents-md-file-adapter.js";
import { BaselineJsonRepositoryAdapter } from "./infrastructure/adapters/baseline-json-repository-adapter.js";
import { ErrorRepetitionJsonRepository } from "./infrastructure/adapters/error-repetition-json-repository.js";
import { EscalationLogExecutorAdapter } from "./infrastructure/adapters/escalation-log-executor-adapter.js";
import { FileSystemDesignDocWriterAdapter } from "./infrastructure/adapters/file-system-design-doc-writer-adapter.js";
import { FileSystemExistenceAdapter } from "./infrastructure/adapters/file-system-existence-adapter.js";
import { FileSystemSha1HasherAdapter } from "./infrastructure/adapters/file-system-sha1-hasher-adapter.js";
import { FileSystemSha256HasherAdapter } from "./infrastructure/adapters/file-system-sha256-hasher-adapter.js";
import { FileSystemTemplateRepositoryAdapter } from "./infrastructure/adapters/file-system-template-repository-adapter.js";
import { GlobFileScannerAdapter } from "./infrastructure/adapters/glob-file-scanner-adapter.js";
import { HarnessApiCommandExistenceAdapter } from "./infrastructure/adapters/harness-api-command-existence-adapter.js";
import { IntegrityManifestJsonRepositoryAdapter } from "./infrastructure/adapters/integrity-manifest-json-repository-adapter.js";
import { LessonArtifactFileReaderAdapter } from "./infrastructure/adapters/lesson-artifact-file-reader-adapter.js";
import { PresetConfigAdapter } from "./infrastructure/adapters/preset-config-adapter.js";
import { ValidatorIdRegistryAdapter } from "./infrastructure/adapters/validator-id-registry-adapter.js";
import { YamlTemplateRendererAdapter } from "./infrastructure/adapters/yaml-template-renderer-adapter.js";
import { CheckAgentContextHandler } from "./presentation/handlers/check-agent-context-handler.js";
import { CheckRepetitionHandler } from "./presentation/handlers/check-repetition-handler.js";
import { CreateBaselineHandler } from "./presentation/handlers/create-baseline-handler.js";
import { GenerateCiTemplateHandler } from "./presentation/handlers/generate-ci-template-handler.js";
import { IntegrityHandler } from "./presentation/handlers/integrity-handler.js";
import { MigrateAgentsMdHandler } from "./presentation/handlers/migrate-agents-md-handler.js";
import { RefreshAgentContextHandler } from "./presentation/handlers/refresh-agent-context-handler.js";
import { RefreshClaudeMdHandler } from "./presentation/handlers/refresh-claude-md-handler.js";
import { ScaffoldDesignHandler } from "./presentation/handlers/scaffold-design-handler.js";

export interface CiGovernanceCompositionRoot {
  generateCiTemplateHandler: GenerateCiTemplateHandler;
  migrateAgentsMdHandler: MigrateAgentsMdHandler;
  refreshAgentContextHandler: RefreshAgentContextHandler;
  refreshClaudeMdHandler: RefreshClaudeMdHandler;
  checkAgentContextHandler: CheckAgentContextHandler;
  checkRepetitionHandler: CheckRepetitionHandler;
  createBaselineHandler: CreateBaselineHandler;
  scaffoldDesignHandler: ScaffoldDesignHandler;
  // Use cases exposed for direct access
  recordErrorOccurrenceUseCase: RecordErrorOccurrenceUseCase;
  checkEscalationUseCase: CheckEscalationUseCase;
  resetRepetitionUseCase: ResetRepetitionUseCase;
  aggregateLessonsUseCase: AggregateLessonsUseCase;
  validatePointersUseCase: ValidatePointersUseCase;
  createBaselineUseCase: CreateBaselineUseCase;
  scaffoldDesignUseCase: ScaffoldDesignUseCase;
  integrityHandler: IntegrityHandler;
}

export function buildCiGovernance(baseDir: string, harnessRoot: string = baseDir): CiGovernanceCompositionRoot {
  // Infrastructure adapters
  const validatorIdRegistryAdapter = new ValidatorIdRegistryAdapter();
  const presetConfigAdapter = new PresetConfigAdapter();
  const errorRepetitionRepository = new ErrorRepetitionJsonRepository(baseDir);
  const escalationExecutorPort = new EscalationLogExecutorAdapter();
  const templateRendererPort = new YamlTemplateRendererAdapter(harnessRoot);
  const fileExistencePort = new FileSystemExistenceAdapter(baseDir);
  const commandExistencePort = new HarnessApiCommandExistenceAdapter();
  const adrExistencePort = new AdrFoundationExistenceAdapter(baseDir);
  const agentsMdPort = new AgentsMdFileAdapter(baseDir);
  const agentContextDocumentPort = new AgentContextFileAdapter(baseDir, harnessRoot);
  const lessonArtifactReaderPort = new LessonArtifactFileReaderAdapter(baseDir);

  // Domain services
  const templateGenerator = new TemplateGenerator(validatorIdRegistryAdapter, presetConfigAdapter);
  const repetitionDetector = new RepetitionDetector(errorRepetitionRepository);
  const pointerValidator = new PointerValidator(commandExistencePort, fileExistencePort, adrExistencePort);
  const lessonAggregator = new LessonAggregator();
  const claudeMdComposer = new ClaudeMdComposer();

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
  const refreshClaudeMdUseCase = new RefreshClaudeMdUseCase(agentContextDocumentPort, claudeMdComposer);
  const refreshAgentContextUseCase = new RefreshAgentContextUseCase(migrateAgentsMdUseCase, refreshClaudeMdUseCase);
  const checkAgentContextUseCase = new CheckAgentContextUseCase(agentContextDocumentPort);
  const aggregateLessonsUseCase = new AggregateLessonsUseCase(lessonArtifactReaderPort, lessonAggregator);
  const validatePointersUseCase = new ValidatePointersUseCase(agentsMdPort, pointerValidator);

  // Baseline adapters & use case (ISSUE-007 Wave 1)
  const fileScanner = new GlobFileScannerAdapter(baseDir);
  const fileHasher = new FileSystemSha1HasherAdapter(baseDir);
  const baselineRepository = new BaselineJsonRepositoryAdapter(baseDir);
  const createBaselineUseCase = new CreateBaselineUseCase(fileScanner, fileHasher, baselineRepository);

  // Scaffold design adapters & use case (ISSUE-007 Wave 4)
  const templateRepository = new FileSystemTemplateRepositoryAdapter(harnessRoot);
  const designDocWriter = new FileSystemDesignDocWriterAdapter(baseDir);
  const scaffoldDesignUseCase = new ScaffoldDesignUseCase(templateRepository, designDocWriter);

  // Handlers
  const generateCiTemplateHandler = new GenerateCiTemplateHandler(generateCiTemplateUseCase, renderCiTemplateUseCase);
  const migrateAgentsMdHandler = new MigrateAgentsMdHandler(migrateAgentsMdUseCase, validatePointersUseCase);
  const refreshAgentContextHandler = new RefreshAgentContextHandler(refreshAgentContextUseCase);
  const refreshClaudeMdHandler = new RefreshClaudeMdHandler(refreshClaudeMdUseCase);
  const checkAgentContextHandler = new CheckAgentContextHandler(checkAgentContextUseCase);
  const checkRepetitionHandler = new CheckRepetitionHandler(checkEscalationUseCase, resetRepetitionUseCase);
  const createBaselineHandler = new CreateBaselineHandler(createBaselineUseCase);
  const scaffoldDesignHandler = new ScaffoldDesignHandler(scaffoldDesignUseCase);

  // Integrity pin adapters & handler (WI-254 / ADR-030 §Decision.3.①)
  const integrityChecker = new IntegrityChecker();
  const sha256Hasher = new FileSystemSha256HasherAdapter(baseDir);
  const integrityManifestRepository = new IntegrityManifestJsonRepositoryAdapter(baseDir);
  const pinIntegrityUseCase = new PinIntegrityUseCase(fileScanner, sha256Hasher, integrityManifestRepository);
  const verifyIntegrityUseCase = new VerifyIntegrityUseCase(
    fileScanner,
    sha256Hasher,
    integrityManifestRepository,
    integrityChecker,
  );
  const integrityHandler = new IntegrityHandler(pinIntegrityUseCase, verifyIntegrityUseCase);

  return {
    generateCiTemplateHandler,
    migrateAgentsMdHandler,
    refreshAgentContextHandler,
    refreshClaudeMdHandler,
    checkAgentContextHandler,
    checkRepetitionHandler,
    createBaselineHandler,
    scaffoldDesignHandler,
    recordErrorOccurrenceUseCase,
    checkEscalationUseCase,
    resetRepetitionUseCase,
    aggregateLessonsUseCase,
    validatePointersUseCase,
    createBaselineUseCase,
    scaffoldDesignUseCase,
    integrityHandler,
  };
}
