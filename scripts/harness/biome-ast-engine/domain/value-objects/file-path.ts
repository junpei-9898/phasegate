/**
 * @layer domain
 * @unit biome-ast-engine
 */

export class InvalidFilePathError extends Error {
  constructor(value: string) {
    super(`Invalid FilePath: ${value}`);
    this.name = 'InvalidFilePathError';
  }
}

const normalizeSegments = (rawValue: string): readonly string[] => {
  const trimmedValue = rawValue.trim();

  if (trimmedValue.length === 0) {
    throw new InvalidFilePathError(rawValue);
  }

  if (trimmedValue.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmedValue)) {
    throw new InvalidFilePathError(rawValue);
  }

  if (trimmedValue.includes('\\')) {
    throw new InvalidFilePathError(rawValue);
  }

  const segments = trimmedValue
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .map((segment) => {
      if (segment === '..') {
        throw new InvalidFilePathError(rawValue);
      }

      return segment;
    });

  if (segments.length === 0) {
    throw new InvalidFilePathError(rawValue);
  }

  return Object.freeze([...segments]);
};

export class FilePath {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromWorkspaceRelative(value: string): FilePath {
    const segments = normalizeSegments(value);
    return Object.freeze(new FilePath(segments.join('/')));
  }

  equals(other: FilePath): boolean {
    return this.value === other.value;
  }

  segments(): readonly string[] {
    return Object.freeze([...this.value.split('/')]);
  }

  fileName(): string {
    const segments = this.value.split('/');
    return segments[segments.length - 1];
  }

  extension(): string {
    const fileName = this.fileName();
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex >= 0 ? fileName.slice(lastDotIndex + 1) : '';
  }

  startsWith(segment: string): boolean {
    const prefixSegments = normalizeSegments(segment);
    const ownSegments = this.value.split('/');

    if (prefixSegments.length > ownSegments.length) {
      return false;
    }

    return prefixSegments.every((prefixSegment, index) => ownSegments[index] === prefixSegment);
  }

  parent(): FilePath {
    const segments = this.value.split('/');

    if (segments.length === 1) {
      return this;
    }

    return Object.freeze(new FilePath(segments.slice(0, -1).join('/')));
  }

  toString(): string {
    return this.value;
  }
}
