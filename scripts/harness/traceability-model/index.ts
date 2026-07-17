/**
 * @layer public-api
 * @unit traceability-model
 * @work-item-id WI-305
 *
 * traceability-model ユニットのバレルエクスポート。
 */

export type {
  ChangedDesignFragmentDto,
  DesignChangeReadDiagnosticDto,
  DesignChangeReadResultDto,
  DesignFragmentChangeKind,
  DesignFragmentCorpusRole,
} from "./application/dto/changed-design-fragment-dto.js";
export type {
  TraceabilityAcceptanceCriterionDto,
  TraceabilityReadDiagnosticDto,
  TraceabilityStoryDto,
  TraceabilityTestReferenceDto,
  TraceabilityTestType,
  TraceabilityUnitDto,
  TraceabilityWorkItemDto,
  TraceabilityWorldReadDto,
} from "./application/dto/traceability-world-read-dto.js";
export { TRACEABILITY_WORLD_READ_SCHEMA_VERSION } from "./application/dto/traceability-world-read-dto.js";
export { DesignChangeReadFacade } from "./application/facades/design-change-read-facade.js";
// Application — public World read facade and plain DTO contract
export { TraceabilityWorldReadFacade } from "./application/facades/traceability-world-read-facade.js";
// Composition Root
export { createTraceabilityModelModule } from "./composition-root.js";
// Domain — value objects
export { ProjectRelativePath } from "./domain/value-objects/project-relative-path.js";
export { StoryId } from "./domain/value-objects/story-id.js";
// Presentation — CLI handlers
export { ValidateMetadataCommandHandler } from "./presentation/cli/validate-metadata-command-handler.js";
