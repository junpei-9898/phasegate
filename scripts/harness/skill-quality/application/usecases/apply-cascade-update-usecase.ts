/**
 * @layer application
 * @unit skill-quality
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

    for (const target of targets) {
      try {
        const isGlobPattern = target.filePath.includes('*');
        const filePaths = isGlobPattern
          ? await this.fileSystemPort.glob(target.filePath)
          : [target.filePath];

        for (const filePath of filePaths) {
          try {
            const content = await this.fileSystemPort.read(filePath);
            // Append story-id tag if not already present
            const updatedContent = content.includes(target.storyIdTag)
              ? content
              : `${content}\n${target.storyIdTag}`;
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
