// @unit world-model
// @layer domain
// @work-item-id WI-287
export type ArtifactKindValue = "design-document" | "source" | "generated-artifact" | "external-declaration";

const VALUES: readonly ArtifactKindValue[] = [
  "design-document",
  "source",
  "generated-artifact",
  "external-declaration",
];

export class InvalidArtifactKindError extends Error {
  constructor(value: string) {
    super(`Invalid World artifact kind: "${value}"`);
    this.name = "InvalidArtifactKindError";
  }
}

export class ArtifactKind {
  readonly value: ArtifactKindValue;

  private constructor(value: ArtifactKindValue) {
    this.value = value;
    Object.freeze(this);
  }

  static parse(value: string): ArtifactKind {
    if (!VALUES.includes(value as ArtifactKindValue)) {
      throw new InvalidArtifactKindError(value);
    }
    return new ArtifactKind(value as ArtifactKindValue);
  }

  static designDocument(): ArtifactKind {
    return new ArtifactKind("design-document");
  }

  static source(): ArtifactKind {
    return new ArtifactKind("source");
  }

  static generatedArtifact(): ArtifactKind {
    return new ArtifactKind("generated-artifact");
  }

  static externalDeclaration(): ArtifactKind {
    return new ArtifactKind("external-declaration");
  }

  equals(other: ArtifactKind): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
