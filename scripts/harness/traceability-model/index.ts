/**
 * @layer public-api
 * @unit traceability-model
 *
 * traceability-model ユニットのバレルエクスポート。
 */

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
// Application — public World read facade and plain DTO contract
export { TraceabilityWorldReadFacade } from "./application/facades/traceability-world-read-facade.js";
// Composition Root
export { createTraceabilityModelModule } from "./composition-root.js";
// Domain — value objects
export { ProjectRelativePath } from "./domain/value-objects/project-relative-path.js";
export { StoryId } from "./domain/value-objects/story-id.js";
// Presentation — CLI handlers
export { ValidateMetadataCommandHandler } from "./presentation/cli/validate-metadata-command-handler.js";
