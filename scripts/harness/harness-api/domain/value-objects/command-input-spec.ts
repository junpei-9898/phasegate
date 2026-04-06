// @layer domain
// command-input-spec.ts — CommandInputSpec Value Object

export interface ArgDef {
  name: string;
  type: 'string' | 'number';
  required?: boolean;
  description?: string;
}

export interface FlagDef {
  name: string;
  shortName?: string;
  type: 'boolean' | 'string';
  description?: string;
}

export interface CommandInputSpecProps {
  args: readonly ArgDef[];
  flags: readonly FlagDef[];
}

export class CommandInputSpec {
  readonly args: readonly ArgDef[];
  readonly flags: readonly FlagDef[];

  private constructor(props: CommandInputSpecProps) {
    this.args = Object.freeze([...props.args]);
    this.flags = Object.freeze([...props.flags]);
    Object.freeze(this);
  }

  static create(props: CommandInputSpecProps): CommandInputSpec {
    return new CommandInputSpec(props);
  }

  static empty(): CommandInputSpec {
    return new CommandInputSpec({ args: [], flags: [] });
  }
}
