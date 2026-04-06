// @layer domain
export interface ImportViolationProps {
  modulePath: string;
  forbiddenPackage: string;
  violationMessage: string;
}

export class ImportViolation {
  readonly modulePath: string;
  readonly forbiddenPackage: string;
  readonly violationMessage: string;

  private constructor(props: ImportViolationProps) {
    this.modulePath = props.modulePath;
    this.forbiddenPackage = props.forbiddenPackage;
    this.violationMessage = props.violationMessage;
    Object.freeze(this);
  }

  static create(props: ImportViolationProps): ImportViolation {
    if (!props.modulePath || props.modulePath.trim().length === 0) {
      throw new Error('InvalidImportViolationError: modulePath must not be empty');
    }
    if (!props.forbiddenPackage || props.forbiddenPackage.trim().length === 0) {
      throw new Error('InvalidImportViolationError: forbiddenPackage must not be empty');
    }
    if (!props.violationMessage || props.violationMessage.trim().length === 0) {
      throw new Error('InvalidImportViolationError: violationMessage must not be empty');
    }
    return new ImportViolation(props);
  }

  equals(other: ImportViolation): boolean {
    return (
      this.modulePath === other.modulePath &&
      this.forbiddenPackage === other.forbiddenPackage
    );
  }
}
