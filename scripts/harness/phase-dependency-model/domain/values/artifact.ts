/**
 * @layer domain
 * @unit phase-dependency-model
 * @work-item-id WI-085
 */
import path from 'node:path';

const ALLOWED_PLACEHOLDERS = new Set([
  'unit',
  'storyId',
  'designDocsRoot',
  'inceptionDocsRoot',
]);
const PLACEHOLDER_PATTERN = /\{([^}]+)\}/g;
const UNRESOLVED_PLACEHOLDER_PATTERN = /\{[^}]+\}/;

export interface PathRoots {
  readonly designDocsRoot: string;
  readonly inceptionDocsRoot: string;
}

export const DEFAULT_PATH_ROOTS: PathRoots = Object.freeze({
  designDocsRoot: 'docs/product/construction',
  inceptionDocsRoot: 'docs/inception',
});

const normalizeProjectPath = (value: string): string => path.posix.normalize(value);

export interface ArtifactCreateArgs {
  readonly name: string;
  readonly path: string;
  readonly required: boolean;
}

export class InvalidArtifactPathError extends Error {
  constructor(path: string) {
    super(`Artifact.pathが不正です: ${path}`);
    this.name = 'InvalidArtifactPathError';
  }
}

const collectPlaceholders = (path: string): readonly string[] => {
  const placeholders: string[] = [];

  for (const match of path.matchAll(PLACEHOLDER_PATTERN)) {
    placeholders.push(match[1]);
  }

  return Object.freeze(placeholders);
};

export class Artifact {
  readonly name: string;
  readonly path: string;
  readonly required: boolean;

  private constructor(args: ArtifactCreateArgs) {
    this.name = args.name.trim();
    this.path = args.path.trim();
    this.required = args.required;
    Object.freeze(this);
  }

  static create(args: ArtifactCreateArgs): Artifact {
    const normalizedPath = args.path.trim();

    if (normalizedPath.length === 0) {
      throw new InvalidArtifactPathError(args.path);
    }

    for (const placeholder of collectPlaceholders(normalizedPath)) {
      if (!ALLOWED_PLACEHOLDERS.has(placeholder)) {
        throw new InvalidArtifactPathError(args.path);
      }
    }

    return new Artifact({
      name: args.name,
      path: normalizedPath,
      required: args.required,
    });
  }

  isPlanArtifact(): boolean {
    return this.path.endsWith('_plan.md');
  }

  resolve(
    scope: { unitId?: string; storyId?: string },
    pathRoots: PathRoots = DEFAULT_PATH_ROOTS,
  ): string {
    let resolvedPath = this.path;

    resolvedPath = resolvedPath.replaceAll(
      '{designDocsRoot}',
      pathRoots.designDocsRoot,
    );
    resolvedPath = resolvedPath.replaceAll(
      '{inceptionDocsRoot}',
      pathRoots.inceptionDocsRoot,
    );
    resolvedPath = resolvedPath.replaceAll('{unit}', scope.unitId ?? '{unit}');
    resolvedPath = resolvedPath.replaceAll(
      '{storyId}',
      scope.storyId ?? '{storyId}',
    );

    if (this.required && UNRESOLVED_PLACEHOLDER_PATTERN.test(resolvedPath)) {
      throw new InvalidArtifactPathError(this.path);
    }

    return normalizeProjectPath(resolvedPath);
  }

  expandRoots(pathRoots: PathRoots = DEFAULT_PATH_ROOTS): string {
    return normalizeProjectPath(
      this.path
        .replaceAll('{designDocsRoot}', pathRoots.designDocsRoot)
        .replaceAll('{inceptionDocsRoot}', pathRoots.inceptionDocsRoot),
    );
  }

  equals(other: Artifact): boolean {
    return (
      this.name === other.name &&
      this.path === other.path &&
      this.required === other.required
    );
  }
}
