// @unit world-model
// @layer domain
// @work-item-id WI-287
export class InvalidPathKeyError extends Error {
  constructor(value: string) {
    super(`Invalid World PathKey: "${value}"`);
    this.name = "InvalidPathKeyError";
  }
}

const encodeRfc3986Component = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export const encodeWorldIdComponent = (value: string): string => {
  if (value.length === 0) {
    throw new InvalidPathKeyError(value);
  }
  return encodeRfc3986Component(value);
};

export const decodeWorldIdComponent = (encoded: string): string => {
  if (encoded.length === 0) {
    throw new InvalidPathKeyError(encoded);
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new InvalidPathKeyError(encoded);
  }
  if (encodeWorldIdComponent(decoded) !== encoded) {
    throw new InvalidPathKeyError(encoded);
  }
  return decoded;
};

const normalizeSegments = (value: string): readonly string[] => {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.includes("\\") || trimmed.startsWith("/") || /^[A-Za-z]:\//.test(trimmed)) {
    throw new InvalidPathKeyError(value);
  }

  const segments = trimmed
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".")
    .map((segment) => {
      if (segment === "..") {
        throw new InvalidPathKeyError(value);
      }
      return segment;
    });

  if (segments.length === 0) {
    throw new InvalidPathKeyError(value);
  }
  return Object.freeze(segments);
};

export class PathKey {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): PathKey {
    return new PathKey(normalizeSegments(value).join("/"));
  }

  static fromEncodedString(value: string): PathKey {
    if (value.includes("\\") || value.startsWith("/") || value.split("/").some((part) => part === "")) {
      throw new InvalidPathKeyError(value);
    }
    const decoded = value
      .split("/")
      .map((segment) => decodeWorldIdComponent(segment))
      .join("/");
    const path = PathKey.create(decoded);
    if (path.toEncodedString() !== value) {
      throw new InvalidPathKeyError(value);
    }
    return path;
  }

  toEncodedString(): string {
    return this.value
      .split("/")
      .map((segment) => encodeWorldIdComponent(segment))
      .join("/");
  }

  equals(other: PathKey): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
