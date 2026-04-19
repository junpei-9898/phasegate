/**
 * @layer composition
 * @unit traceability-model
 *
 * traceability-model ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */
import { MarkdownStoryCatalogGateway } from './infrastructure/gateways/markdown-story-catalog-gateway.js';
import { MarkdownUnitDefinitionGateway } from './infrastructure/gateways/markdown-unit-definition-gateway.js';
import { FileSystemMetadataReader } from './infrastructure/gateways/file-system-metadata-reader.js';
import { MarkdownDesignDocumentGateway } from './infrastructure/gateways/markdown-design-document-gateway.js';
import { FileSystemInceptionPlanGateway } from './infrastructure/gateways/file-system-inception-plan-gateway.js';
import { MetadataValidator } from './domain/services/metadata-validator.js';
import { TraceabilityChainBuilder } from './domain/services/traceability-chain-builder.js';
import { StoryIdAliasResolver } from './domain/services/story-id-alias-resolver.js';
import { ValidateImplementationMetadataUseCase } from './application/usecases/validate-implementation-metadata-usecase.js';
import { ValidateDesignStoryAnnotationsUseCase } from './application/usecases/validate-design-story-annotations-usecase.js';
import { ValidateTestStoryMetadataUseCase } from './application/usecases/validate-test-story-metadata-usecase.js';
import { ValidateMetadataCommandHandler } from './presentation/cli/validate-metadata-command-handler.js';
import { ProjectRelativePath } from './domain/value-objects/project-relative-path.js';

export function createTraceabilityModelModule(rootDir: string) {
  // Infrastructure gateways
  const storyCatalog = new MarkdownStoryCatalogGateway({ rootDir });
  const unitDefinition = new MarkdownUnitDefinitionGateway({ rootDir });
  const metadataReader = new FileSystemMetadataReader({ rootDir });
  const designDocument = new MarkdownDesignDocumentGateway({ rootDir });
  const inceptionPlan = new FileSystemInceptionPlanGateway({ rootDir });

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
  });
  const storyIdAliasResolver = new StoryIdAliasResolver(storyCatalog);

  // Usecases
  const validateImplementationMetadataUseCase =
    new ValidateImplementationMetadataUseCase({
      metadataReaderPort: metadataReader,
      validator: metadataValidator,
    });
  const validateDesignStoryAnnotationsUseCase =
    new ValidateDesignStoryAnnotationsUseCase({
      designDocumentPort: designDocument,
      validator: metadataValidator,
    });
  const validateTestStoryMetadataUseCase =
    new ValidateTestStoryMetadataUseCase({
      metadataReaderPort: metadataReader,
      validator: metadataValidator,
    });

  // Presentation handlers
  const validateMetadataCommandHandler = new ValidateMetadataCommandHandler({
    validateImplementationMetadataUseCase,
    validateDesignStoryAnnotationsUseCase,
    validateTestStoryMetadataUseCase,
    createProjectRelativePath: (value: string) =>
      ProjectRelativePath.create(value),
  });

  return {
    validateMetadataCommandHandler,
    // expose key services for cross-unit use
    storyCatalog,
  } as const;
}
