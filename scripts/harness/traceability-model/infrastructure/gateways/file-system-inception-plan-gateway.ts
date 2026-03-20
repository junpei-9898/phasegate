/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * docs/inception/{unit}/{storyId}/ の存在確認で InceptionPlanPort を実装するゲートウェイ
 */
import { readdir } from 'node:fs/promises';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { InceptionPlanPort } from '../../domain/ports/inception-plan-port.js';
import type { ProjectRelativePathLike } from '../../domain/value-objects/chain-link.js';
import type { StoryIdLike } from '../../domain/value-objects/story-reference.js';
import { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

const PLAN_FILE_PATTERN = /_plan\.md$/;

export interface FileSystemInceptionPlanGatewayDeps {
  readonly rootDir: string;
}

export class FileSystemInceptionPlanGateway implements InceptionPlanPort {
  private readonly rootDir: string;

  constructor(deps: FileSystemInceptionPlanGatewayDeps) {
    this.rootDir = deps.rootDir;
  }

  async exists(unitName: string, storyId: StoryIdLike): Promise<boolean> {
    const planRoot = await this.findPlanRoot(unitName, storyId);
    return planRoot !== null;
  }

  async findPlanRoot(
    unitName: string,
    storyId: StoryIdLike,
  ): Promise<ProjectRelativePathLike | null> {
    const relativePath = `docs/inception/${unitName}/${storyId.value}`;
    const absolutePath = path.join(this.rootDir, relativePath);

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const statResult = fs.statSync(absolutePath);
    if (!statResult.isDirectory()) {
      return null;
    }

    // 最低1つの *_plan.md が存在することを確認する
    try {
      const entries = await readdir(absolutePath);
      const hasPlanFile = entries.some((entry) => PLAN_FILE_PATTERN.test(entry));
      if (!hasPlanFile) {
        return null;
      }
    } catch {
      return null;
    }

    return ProjectRelativePath.create(relativePath);
  }

  async findPlanByStoryId(
    storyId: StoryIdLike,
  ): Promise<ProjectRelativePathLike | null> {
    const inceptionDir = path.join(this.rootDir, 'docs', 'inception');

    if (!fs.existsSync(inceptionDir)) {
      return null;
    }

    try {
      const unitDirs = await readdir(inceptionDir);
      for (const unitDir of unitDirs) {
        const result = await this.findPlanRoot(unitDir, storyId);
        if (result !== null) {
          return result;
        }
      }
    } catch {
      return null;
    }

    return null;
  }
}
