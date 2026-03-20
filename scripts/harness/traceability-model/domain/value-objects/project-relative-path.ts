/**
 * @layer domain
 * @unit traceability-model
 *
 * docs/ または scripts/ 配下のPOSIX相対パス
 */
const ALLOWED_PROJECT_ROOTS = new Set(['docs', 'scripts']);

export class ProjectRelativePathError extends Error {
  constructor(value: string) {
    super(`ProjectRelativePathが不正です: ${value}`);
    this.name = 'ProjectRelativePathError';
  }
}

const normalizeSegments = (rawValue: string): readonly string[] => {
  const normalizedValue = rawValue.trim();

  if (normalizedValue.length === 0) {
    throw new ProjectRelativePathError(rawValue);
  }

  if (normalizedValue.includes('\\')) {
    throw new ProjectRelativePathError(rawValue);
  }

  if (normalizedValue.startsWith('/') || /^[A-Za-z]:\//.test(normalizedValue)) {
    throw new ProjectRelativePathError(rawValue);
  }

  const segments = normalizedValue
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .map((segment) => {
      if (segment === '..') {
        throw new ProjectRelativePathError(rawValue);
      }

      return segment;
    });

  if (segments.length === 0 || !ALLOWED_PROJECT_ROOTS.has(segments[0])) {
    throw new ProjectRelativePathError(rawValue);
  }

  return Object.freeze([...segments]);
};

export class ProjectRelativePath {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): ProjectRelativePath {
    const segments = normalizeSegments(value);
    return new ProjectRelativePath(segments.join('/'));
  }

  join(...segments: readonly string[]): ProjectRelativePath {
    return ProjectRelativePath.create([this.value, ...segments].join('/'));
  }

  dirname(): ProjectRelativePath {
    const segments = this.value.split('/');
    const parentSegments = segments.slice(0, -1);
    const parentValue = parentSegments.length > 0 ? parentSegments.join('/') : this.value;
    return ProjectRelativePath.create(parentValue);
  }

  basename(): string {
    const segments = this.value.split('/');
    return segments[segments.length - 1];
  }

  extname(): string {
    const baseName = this.basename();
    const extensionIndex = baseName.lastIndexOf('.');
    return extensionIndex >= 0 ? baseName.slice(extensionIndex) : '';
  }

  startsWith(prefix: string): boolean {
    const normalizedPrefix = ProjectRelativePath.create(prefix).value;
    return this.value.startsWith(normalizedPrefix);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProjectRelativePath): boolean {
    return this.value === other.value;
  }
}
