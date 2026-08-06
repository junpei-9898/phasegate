/**
 * @layer infrastructure
 * @unit ci-governance
 * @work-item-id WI-367, WI-368, WI-369
 *
 * Composition Root - 依存性の組み立て
 */

import { AggregateLessonsUseCase } from "./application/usecases/aggregate-lessons-usecase.js";
import { CheckAgentContextUseCase } from "./application/usecases/check-agent-context-usecase.js";
import { CheckEscalationUseCase } from "./application/usecases/check-escalation-usecase.js";
import { CreateBaselineUseCase } from "./application/usecases/create-baseline-usecase.js";
import { GenerateCiTemplateUseCase } from "./application/usecases/generate-ci-template-usecase.js";
import { ListTemplatesUseCase } from "./application/usecases/list-templates-usecase.js";
import { MigrateAgentsMdUseCase } from "./application/usecases/migrate-agents-md-usecase.js";
import { PinIntegrityUseCase } from "./application/usecases/pin-integrity-usecase.js";
import { RecordErrorOccurrenceUseCase } from "./application/usecases/record-error-occurrence-usecase.js";
import { RefreshAgentContextUseCase } from "./application/usecases/refresh-agent-context-usecase.js";
import { RefreshClaudeMdUseCase } from "./application/usecases/refresh-claude-md-usecase.js";
import { RenderCiTemplateUseCase } from "./application/usecases/render-ci-template-usecase.js";
import { ResetRepetitionUseCase } from "./application/usecases/reset-repetition-usecase.js";
import { ScaffoldDesignUseCase } from "./application/usecases/scaffold-design-usecase.js";
import { ScaffoldInceptionUseCase } from "./application/usecases/scaffold-inception-usecase.js";
import { ShowTemplateUseCase } from "./application/usecases/show-template-usecase.js";
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
import { FileSystemInceptionDocWriterAdapter } from "./infrastructure/adapters/file-system-inception-doc-writer-adapter.js";
import { FileSystemInceptionTemplateRepositoryAdapter } from "./infrastructure/adapters/file-system-inception-template-repository-adapter.js";
import { FileSystemSha1HasherAdapter } from "./infrastructure/adapters/file-system-sha1-hasher-adapter.js";
import { FileSystemSha256HasherAdapter } from "./infrastructure/adapters/file-system-sha256-hasher-adapter.js";
import { FileSystemTemplateCatalogAdapter } from "./infrastructure/adapters/file-system-template-catalog-adapter.js";
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
import { ScaffoldInceptionHandler } from "./presentation/handlers/scaffold-inception-handler.js";
import { TemplatesHandler } from "./presentation/handlers/templates-handler.js";

export interface CiGovernanceCompositionRoot {
  generateCiTemplateHandler: GenerateCiTemplateHandler;
  migrateAgentsMdHandler: MigrateAgentsMdHandler;
  refreshAgentContextHandler: RefreshAgentContextHandler;
  refreshClaudeMdHandler: RefreshClaudeMdHandler;
  checkAgentContextHandler: CheckAgentContextHandler;
  checkRepetitionHandler: CheckRepetitionHandler;
  createBaselineHandler: CreateBaselineHandler;
  scaffoldDesignHandler: ScaffoldDesignHandler;
  scaffoldInceptionHandler: ScaffoldInceptionHandler;
  templatesHandler: TemplatesHandler;
  // Use cases exposed for direct access
  recordErrorOccurrenceUseCase: RecordErrorOccurrenceUseCase;
  checkEscalationUseCase: CheckEscalationUseCase;
  resetRepetitionUseCase: ResetRepetitionUseCase;
  aggregateLessonsUseCase: AggregateLessonsUseCase;
  validatePointersUseCase: ValidatePointersUseCase;
  createBaselineUseCase: CreateBaselineUseCase;
  scaffoldDesignUseCase: ScaffoldDesignUseCase;
  scaffoldInceptionUseCase: ScaffoldInceptionUseCase;
  integrityHandler: IntegrityHandler;
}

/**
 * 解決済みの設計文書ルート（`phasegate.config.json` の `paths`）。
 * 省略時は従来どおり `docs/product/construction` / `docs/inception` を使う。
 *
 * WI-369: これを渡さないと `scaffold-design` の書き込み先が
 * `docs/product/construction` に固定され、`paths.designDocs` を移設した PJ で
 * scaffold 先とフェーズゲートの検査先がズレる。
 */
export interface CiGovernanceDocPaths {
  readonly designDocs?: string;
  readonly inceptionDocs?: string;
}

const DEFAULT_DESIGN_DOCS_ROOT = "docs/product/construction";
const DEFAULT_INCEPTION_DOCS_ROOT = "docs/inception";

export function buildCiGovernance(
  baseDir: string,
  harnessRoot: string = baseDir,
  docPaths: CiGovernanceDocPaths = {},
): CiGovernanceCompositionRoot {
  const designDocsRoot = docPaths.designDocs ?? DEFAULT_DESIGN_DOCS_ROOT;
  const inceptionDocsRoot = docPaths.inceptionDocs ?? DEFAULT_INCEPTION_DOCS_ROOT;
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

  // Scaffold design adapters & use case (ISSUE-007 Wave 4 / WI-369 paths 追従)
  const templateRepository = new FileSystemTemplateRepositoryAdapter(harnessRoot);
  const designDocWriter = new FileSystemDesignDocWriterAdapter(baseDir, designDocsRoot);
  const scaffoldDesignUseCase = new ScaffoldDesignUseCase(templateRepository, designDocWriter);

  // Scaffold inception adapters & use case (WI-368)
  const inceptionTemplateRepository = new FileSystemInceptionTemplateRepositoryAdapter(harnessRoot);
  const inceptionDocWriter = new FileSystemInceptionDocWriterAdapter(baseDir, {
    designDocsRoot,
    inceptionDocsRoot,
  });
  const scaffoldInceptionUseCase = new ScaffoldInceptionUseCase(inceptionTemplateRepository, inceptionDocWriter);

  // Template catalog adapters & use cases (WI-367)
  const templateCatalog = new FileSystemTemplateCatalogAdapter(harnessRoot);
  const listTemplatesUseCase = new ListTemplatesUseCase(templateCatalog);
  const showTemplateUseCase = new ShowTemplateUseCase(templateCatalog);

  // Handlers
  const generateCiTemplateHandler = new GenerateCiTemplateHandler(generateCiTemplateUseCase, renderCiTemplateUseCase);
  const migrateAgentsMdHandler = new MigrateAgentsMdHandler(migrateAgentsMdUseCase, validatePointersUseCase);
  const refreshAgentContextHandler = new RefreshAgentContextHandler(refreshAgentContextUseCase);
  const refreshClaudeMdHandler = new RefreshClaudeMdHandler(refreshClaudeMdUseCase);
  const checkAgentContextHandler = new CheckAgentContextHandler(checkAgentContextUseCase);
  const checkRepetitionHandler = new CheckRepetitionHandler(checkEscalationUseCase, resetRepetitionUseCase);
  const createBaselineHandler = new CreateBaselineHandler(createBaselineUseCase);
  const scaffoldDesignHandler = new ScaffoldDesignHandler(scaffoldDesignUseCase);
  const scaffoldInceptionHandler = new ScaffoldInceptionHandler(scaffoldInceptionUseCase);
  const templatesHandler = new TemplatesHandler(listTemplatesUseCase, showTemplateUseCase);

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
    scaffoldInceptionHandler,
    templatesHandler,
    recordErrorOccurrenceUseCase,
    checkEscalationUseCase,
    resetRepetitionUseCase,
    aggregateLessonsUseCase,
    validatePointersUseCase,
    createBaselineUseCase,
    scaffoldDesignUseCase,
    scaffoldInceptionUseCase,
    integrityHandler,
  };
}
