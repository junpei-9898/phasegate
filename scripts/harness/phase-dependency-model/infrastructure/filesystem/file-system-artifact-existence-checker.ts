/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import { access } from 'node:fs/promises';
import * as path from 'node:path';
import type { ArtifactExistenceCheckerPort } from '../../domain/ports/artifact-existence-checker-port.js';
import type { Artifact, PathRoots } from '../../domain/values/artifact.js';

export interface FileSystemArtifactExistenceCheckerDeps {
  readonly rootDir: string;
}

export class FileSystemArtifactExistenceChecker
  implements ArtifactExistenceCheckerPort
{
  private readonly rootDir: string;

  constructor(deps: FileSystemArtifactExistenceCheckerDeps) {
    this.rootDir = deps.rootDir;
  }

  async checkAll(
    artifacts: readonly Artifact[],
    scope: { unitId?: string; storyId?: string },
    pathRoots?: PathRoots,
  ): Promise<ReadonlyMap<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const artifact of artifacts) {
      let resolvedPath: string;
      try {
        resolvedPath = artifact.resolve(scope, pathRoots);
      } catch {
        results.set(artifact.path, false);
        continue;
      }
      const absolutePath = path.join(this.rootDir, resolvedPath);
      const exists = await this.fileExists(absolutePath);
      results.set(resolvedPath, exists);
    }

    return results;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
