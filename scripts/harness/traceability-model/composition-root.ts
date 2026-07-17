/**
 * @layer application
 * @unit traceability-model
 * @work-item-id WI-093
 * @work-item-id WI-305
 *
 * traceability-model ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */

import { DesignChangeReadFacade } from "./application/facades/design-change-read-facade.js";
import { TraceabilityWorldReadFacade } from "./application/facades/traceability-world-read-facade.js";
import { ApplyWorkItemMigrationUseCase } from "./application/usecases/apply-work-item-migration-usecase.js";
import { ApplyWorkItemStatusUseCase } from "./application/usecases/apply-work-item-status-usecase.js";
import { DeriveWorkItemStatusUseCase } from "./application/usecases/derive-work-item-status-usecase.js";
import { PlanWorkItemMigrationUseCase } from "./application/usecases/plan-work-item-migration-usecase.js";
import { ValidateDesignStoryAnnotationsUseCase } from "./application/usecases/validate-design-story-annotations-usecase.js";
import { ValidateImplementationMetadataUseCase } from "./application/usecases/validate-implementation-metadata-usecase.js";
import { ValidateTestStoryMetadataUseCase } from "./application/usecases/validate-test-story-metadata-usecase.js";
import { MetadataValidator } from "./domain/services/metadata-validator.js";
import { StoryIdAliasResolver } from "./domain/services/story-id-alias-resolver.js";
import { TraceabilityChainBuilder } from "./domain/services/traceability-chain-builder.js";
import { WorkItemStatusDerivationService } from "./domain/services/work-item-status-derivation-service.js";
import { ProjectRelativePath } from "./domain/value-objects/project-relative-path.js";
import { FileSystemTraceabilityWorldReadAdapter } from "./infrastructure/adapters/file-system-traceability-world-read-adapter.js";
import { GitStagedDesignChangeAdapter } from "./infrastructure/adapters/git-staged-design-change-adapter.js";
import { FileSystemInceptionPlanGateway } from "./infrastructure/gateways/file-system-inception-plan-gateway.js";
import { FileSystemMetadataReader } from "./infrastructure/gateways/file-system-metadata-reader.js";
import { FileSystemWorkItemIdentityGateway } from "./infrastructure/gateways/file-system-work-item-identity-gateway.js";
import { FileSystemWorkItemMigrationApplyGateway } from "./infrastructure/gateways/file-system-work-item-migration-apply-gateway.js";
import { FileSystemWorkItemMigrationSourceGateway } from "./infrastructure/gateways/file-system-work-item-migration-source-gateway.js";
import { FileSystemWorkItemStatusGateway } from "./infrastructure/gateways/file-system-work-item-status-gateway.js";
import { MarkdownDesignDocumentGateway } from "./infrastructure/gateways/markdown-design-document-gateway.js";
import { MarkdownStoryCatalogGateway } from "./infrastructure/gateways/markdown-story-catalog-gateway.js";
import { MarkdownUnitDefinitionGateway } from "./infrastructure/gateways/markdown-unit-definition-gateway.js";
import { MigrateWorkItemsCommandHandler } from "./presentation/cli/migrate-work-items-command-handler.js";
import { ValidateMetadataCommandHandler } from "./presentation/cli/validate-metadata-command-handler.js";
import { WorkItemStatusCommandHandler } from "./presentation/cli/work-item-status-command-handler.js";

export interface TraceabilityModelPathRoots {
  readonly designDocsRoot: string;
  readonly inceptionRoot?: string;
  readonly testRoots?: readonly string[];
}

export interface TraceabilityModelModuleOptions {
  readonly pathRoots?: TraceabilityModelPathRoots;
}

const deriveProductDocsRoot = (designDocsRoot: string): string => {
  const normalized = designDocsRoot.replace(/\/+$/, "");
  if (normalized.endsWith("/construction")) {
    return normalized.slice(0, -"/construction".length);
  }
  return normalized;
};

export function createTraceabilityModelModule(rootDir: string, options: TraceabilityModelModuleOptions = {}) {
  const designDocsRoot = options.pathRoots?.designDocsRoot ?? "docs/product/construction";
  const productDocsRoot = deriveProductDocsRoot(designDocsRoot);
  const storyCatalogPath = `${productDocsRoot}/user_stories.md`;
  const inceptionRoot = options.pathRoots?.inceptionRoot ?? "docs/inception";
  const testRoots = options.pathRoots?.testRoots ?? ["scripts/harness/__tests__"];

  // Infrastructure gateways
  const storyCatalog = new MarkdownStoryCatalogGateway({ rootDir, storyCatalogPath });
  const unitDefinition = new MarkdownUnitDefinitionGateway({
    rootDir,
    productDocsRoot,
    designDocsRoot,
  });
  const metadataReader = new FileSystemMetadataReader({ rootDir });
  const designDocument = new MarkdownDesignDocumentGateway({ rootDir, designDocsRoot });
  const inceptionPlan = new FileSystemInceptionPlanGateway({ rootDir });
  const workItemMigrationSource = new FileSystemWorkItemMigrationSourceGateway({ rootDir });
  const workItemMigrationApply = new FileSystemWorkItemMigrationApplyGateway({ rootDir });
  const workItemIdentity = new FileSystemWorkItemIdentityGateway({ rootDir });
  const workItemStatus = new FileSystemWorkItemStatusGateway({ rootDir });
  const worldReadSource = new FileSystemTraceabilityWorldReadAdapter({
    rootDir,
    productDocsRoot,
    designDocsRoot,
    storyCatalogPath,
    inceptionRoot,
    testRoots,
    unitDefinitionGateway: unitDefinition,
  });

  // Domain services
  const metadataValidator = new MetadataValidator({
    storyCatalogPort: storyCatalog,
    unitDefinitionPort: unitDefinition,
  });
  const traceabilityChainBuilder = new TraceabilityChainBuilder({
    metadataReaderPort: metadataReader,
    unitDefinitionPort: unitDefinition,
    designDocumentPort: designDocument,
    storyCatalogPort: storyCatalog,
    inceptionPlanPort: inceptionPlan,
    storyCatalogPath,
  });
  const storyIdAliasResolver = new StoryIdAliasResolver(storyCatalog);
  const workItemStatusDerivationService = new WorkItemStatusDerivationService();
  const worldReadFacade = new TraceabilityWorldReadFacade({
    sourcePort: worldReadSource,
  });
  const designChangeReadFacade = new DesignChangeReadFacade(new GitStagedDesignChangeAdapter(rootDir));

  // Usecases
  const validateImplementationMetadataUseCase = new ValidateImplementationMetadataUseCase({
    metadataReaderPort: metadataReader,
    validator: metadataValidator,
  });
  const validateDesignStoryAnnotationsUseCase = new ValidateDesignStoryAnnotationsUseCase({
    designDocumentPort: designDocument,
    validator: metadataValidator,
    workItemIdentityPort: workItemIdentity,
  });
  const validateTestStoryMetadataUseCase = new ValidateTestStoryMetadataUseCase({
    metadataReaderPort: metadataReader,
    validator: metadataValidator,
  });
  const planWorkItemMigrationUseCase = new PlanWorkItemMigrationUseCase({
    sourcePort: workItemMigrationSource,
  });
  const applyWorkItemMigrationUseCase = new ApplyWorkItemMigrationUseCase({
    planWorkItemMigrationUseCase,
    applyPort: workItemMigrationApply,
  });
  const deriveWorkItemStatusUseCase = new DeriveWorkItemStatusUseCase({
    workItemStatusPort: workItemStatus,
    derivationService: workItemStatusDerivationService,
  });
  const applyWorkItemStatusUseCase = new ApplyWorkItemStatusUseCase({
    deriveWorkItemStatusUseCase,
    workItemStatusPort: workItemStatus,
  });

  // Presentation handlers
  const validateMetadataCommandHandler = new ValidateMetadataCommandHandler({
    validateImplementationMetadataUseCase,
    validateDesignStoryAnnotationsUseCase,
    validateTestStoryMetadataUseCase,
    createProjectRelativePath: (value: string) => ProjectRelativePath.create(value),
  });
  const migrateWorkItemsCommandHandler = new MigrateWorkItemsCommandHandler({
    planWorkItemMigrationUseCase,
    applyWorkItemMigrationUseCase,
  });
  const workItemStatusCommandHandler = new WorkItemStatusCommandHandler({
    deriveWorkItemStatusUseCase,
    applyWorkItemStatusUseCase,
  });

  return {
    validateMetadataCommandHandler,
    migrateWorkItemsCommandHandler,
    workItemStatusCommandHandler,
    // expose key services for cross-unit use
    storyCatalog,
    traceabilityChainBuilder,
    storyIdAliasResolver,
    worldReadFacade,
    designChangeReadFacade,
  } as const;
}
