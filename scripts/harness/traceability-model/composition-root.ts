/**
 * @layer application
 * @unit traceability-model
 *
 * traceability-model ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */

import { ApplyWorkItemMigrationUseCase } from "./application/usecases/apply-work-item-migration-usecase.js";
import { PlanWorkItemMigrationUseCase } from "./application/usecases/plan-work-item-migration-usecase.js";
import { ValidateDesignStoryAnnotationsUseCase } from "./application/usecases/validate-design-story-annotations-usecase.js";
import { ValidateImplementationMetadataUseCase } from "./application/usecases/validate-implementation-metadata-usecase.js";
import { ValidateTestStoryMetadataUseCase } from "./application/usecases/validate-test-story-metadata-usecase.js";
import { MetadataValidator } from "./domain/services/metadata-validator.js";
import { StoryIdAliasResolver } from "./domain/services/story-id-alias-resolver.js";
import { TraceabilityChainBuilder } from "./domain/services/traceability-chain-builder.js";
import { ProjectRelativePath } from "./domain/value-objects/project-relative-path.js";
import { FileSystemInceptionPlanGateway } from "./infrastructure/gateways/file-system-inception-plan-gateway.js";
import { FileSystemMetadataReader } from "./infrastructure/gateways/file-system-metadata-reader.js";
import { FileSystemWorkItemMigrationApplyGateway } from "./infrastructure/gateways/file-system-work-item-migration-apply-gateway.js";
import { FileSystemWorkItemMigrationSourceGateway } from "./infrastructure/gateways/file-system-work-item-migration-source-gateway.js";
import { MarkdownDesignDocumentGateway } from "./infrastructure/gateways/markdown-design-document-gateway.js";
import { MarkdownStoryCatalogGateway } from "./infrastructure/gateways/markdown-story-catalog-gateway.js";
import { MarkdownUnitDefinitionGateway } from "./infrastructure/gateways/markdown-unit-definition-gateway.js";
import { MigrateWorkItemsCommandHandler } from "./presentation/cli/migrate-work-items-command-handler.js";
import { ValidateMetadataCommandHandler } from "./presentation/cli/validate-metadata-command-handler.js";

export interface TraceabilityModelPathRoots {
  readonly designDocsRoot: string;
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

export function createTraceabilityModelModule(
  rootDir: string,
  options: TraceabilityModelModuleOptions = {},
) {
  const designDocsRoot = options.pathRoots?.designDocsRoot ?? "docs/product/construction";
  const productDocsRoot = deriveProductDocsRoot(designDocsRoot);
  const storyCatalogPath = `${productDocsRoot}/user_stories.md`;

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

  // Usecases
  const validateImplementationMetadataUseCase = new ValidateImplementationMetadataUseCase({
    metadataReaderPort: metadataReader,
    validator: metadataValidator,
  });
  const validateDesignStoryAnnotationsUseCase = new ValidateDesignStoryAnnotationsUseCase({
    designDocumentPort: designDocument,
    validator: metadataValidator,
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

  return {
    validateMetadataCommandHandler,
    migrateWorkItemsCommandHandler,
    // expose key services for cross-unit use
    storyCatalog,
    traceabilityChainBuilder,
    storyIdAliasResolver,
  } as const;
}
