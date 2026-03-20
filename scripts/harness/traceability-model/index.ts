/**
 * @layer public-api
 * @unit traceability-model
 *
 * traceability-model ユニットのバレルエクスポート。
 */

// Composition Root
export { createTraceabilityModelModule } from './composition-root.js';

// Domain — value objects
export { ProjectRelativePath } from './domain/value-objects/project-relative-path.js';
export { StoryId } from './domain/value-objects/story-id.js';

// Presentation — CLI handlers
export { ValidateMetadataCommandHandler } from './presentation/cli/validate-metadata-command-handler.js';
