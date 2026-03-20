/**
 * @layer domain
 * @unit traceability-model
 */

export interface DesignDocumentFlagsArgs {
  readonly initialCreation: boolean;
}

export class DesignDocumentFlags {
  readonly initialCreation: boolean;
  readonly annotationRequired: boolean;

  private constructor(initialCreation: boolean) {
    this.initialCreation = initialCreation;
    this.annotationRequired = !initialCreation;
    Object.freeze(this);
  }

  static create(input: boolean | DesignDocumentFlagsArgs): DesignDocumentFlags {
    const initialCreation =
      typeof input === 'boolean' ? input : input.initialCreation;
    return new DesignDocumentFlags(initialCreation);
  }

  requiresStoryIdAnnotation(): boolean {
    return this.annotationRequired;
  }

  allowsStoryIdOmission(): boolean {
    return !this.annotationRequired;
  }

  equals(other: DesignDocumentFlags): boolean {
    return (
      this.initialCreation === other.initialCreation &&
      this.annotationRequired === other.annotationRequired
    );
  }
}
