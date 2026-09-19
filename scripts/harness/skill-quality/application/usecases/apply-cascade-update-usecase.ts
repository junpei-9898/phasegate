/**
 * @layer application
 * @unit skill-quality
 * @work-item-id WI-192
 * @work-item-id WI-220
 */
import { CascadeUpdateResult } from '../../domain/value-objects/cascade-update-result.js';
import type { CascadeUpdateService } from '../../domain/services/cascade-update-service.js';
import type { FileSystemPort } from '../../domain/ports/file-system-port.js';
import type { ApplyCascadeUpdateInput } from '../dto/apply-cascade-update-input.js';
import type { ApplyCascadeUpdateOutput } from '../dto/apply-cascade-update-output.js';

export class ApplyCascadeUpdateUseCase {
  constructor(
    private readonly cascadeUpdateService: CascadeUpdateService,
    private readonly fileSystemPort: FileSystemPort,
  ) {}

  async execute(input: ApplyCascadeUpdateInput): Promise<ApplyCascadeUpdateOutput> {
    const targets = await this.cascadeUpdateService.resolve(input.storyId);

    let updatedCount = 0;
    const appliedStoryIds: string[] = [];
    const errors: string[] = [];
    const visitedFiles = new Set<string>();

    for (const target of targets) {
      try {
        const isGlobPattern = target.filePath.includes('*');
        const filePaths = isGlobPattern
          ? await this.fileSystemPort.glob(target.filePath)
          : [target.filePath];

        for (const filePath of filePaths) {
          if (visitedFiles.has(filePath)) continue;
          visitedFiles.add(filePath);
          try {
            const content = await this.fileSystemPort.read(filePath);
            // This is exact tag presence, not proof of semantic reflection.
            const updatedContent = target.hasAnnotationIn(content)
              ? content
              : `${content}\n${target.renderAnnotation(filePath)}`;
            if (updatedContent === content) continue;
            if (!input.dryRun) {
              await this.fileSystemPort.write(filePath, updatedContent);
            }
            updatedCount++;
            if (!appliedStoryIds.includes(target.storyIdTag)) {
              appliedStoryIds.push(target.storyIdTag);
            }
          } catch (err) {
            errors.push(`Failed to update ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to process ${target.filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const result = CascadeUpdateResult.create({ updatedCount, appliedStoryIds, errors });
    return {
      updatedCount: result.updatedCount,
      appliedStoryIds: result.appliedStoryIds,
      errors: result.errors,
    };
  }
}
