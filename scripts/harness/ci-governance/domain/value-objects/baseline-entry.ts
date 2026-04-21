// @unit ci-governance
// @layer domain

export interface BaselineEntryProps {
  readonly path: string;
  readonly sha1: string;
}

export class BaselineEntry {
  readonly path: string;
  readonly sha1: string;

  private constructor(props: BaselineEntryProps) {
    this.path = props.path;
    this.sha1 = props.sha1;
    Object.freeze(this);
  }

  static create(props: BaselineEntryProps): BaselineEntry {
    if (props.path.length === 0) {
      throw new Error('BaselineEntry: path must not be empty');
    }
    if (!/^[0-9a-f]{40}$/.test(props.sha1)) {
      throw new Error(
        `BaselineEntry: sha1 must be 40 lowercase hex chars, got: ${props.sha1}`,
      );
    }
    return new BaselineEntry(props);
  }

  equals(other: BaselineEntry): boolean {
    return this.path === other.path && this.sha1 === other.sha1;
  }
}
