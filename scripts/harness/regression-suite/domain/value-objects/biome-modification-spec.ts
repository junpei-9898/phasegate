export interface BiomeModificationSpecProps {
  targetApi: string;
  replacementApi: string;
  modificationReason: string;
}

export class BiomeModificationSpec {
  readonly targetApi: string;
  readonly replacementApi: string;
  readonly modificationReason: string;

  private constructor(props: BiomeModificationSpecProps) {
    this.targetApi = props.targetApi;
    this.replacementApi = props.replacementApi;
    this.modificationReason = props.modificationReason;
    Object.freeze(this);
  }

  static create(props: BiomeModificationSpecProps): BiomeModificationSpec {
    if (!props.targetApi || props.targetApi.trim().length === 0) {
      throw new Error('InvalidBiomeModificationSpecError: targetApi must not be empty');
    }
    if (!props.replacementApi || props.replacementApi.trim().length === 0) {
      throw new Error('InvalidBiomeModificationSpecError: replacementApi must not be empty');
    }
    if (!props.modificationReason || props.modificationReason.trim().length === 0) {
      throw new Error('InvalidBiomeModificationSpecError: modificationReason must not be empty');
    }
    if (props.targetApi === props.replacementApi) {
      throw new Error('InvalidBiomeModificationSpecError: targetApi and replacementApi must be different');
    }
    return new BiomeModificationSpec(props);
  }

  equals(other: BiomeModificationSpec): boolean {
    return this.targetApi === other.targetApi && this.replacementApi === other.replacementApi;
  }
}
