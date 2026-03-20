// cli-command-definition.ts — CliCommandDefinition Value Object

import { CommandInputSpec } from './command-input-spec.js';
import { ExitCodeSpec } from './exit-code-spec.js';

export type CommandName = string;

export type CommandOutputType =
  | 'check-ready'
  | 'check-phase'
  | 'ci-check'
  | 'detect-drift'
  | 'status'
  | 'lint'
  | 'complete-check'
  | 'impact-analysis';

const COMMAND_NAME_REGEX = /^harness:[a-z][a-z0-9-]*$/;

const OUTPUT_TYPE_MAP: Record<string, CommandOutputType> = {
  'harness:check-ready': 'check-ready',
  'harness:check-phase': 'check-phase',
  'harness:ci-check': 'ci-check',
  'harness:detect-drift': 'detect-drift',
  'harness:status': 'status',
  'harness:lint': 'lint',
  'harness:complete-check': 'complete-check',
  'harness:impact-analysis': 'impact-analysis',
};

export interface CliCommandDefinitionProps {
  commandName: CommandName;
  description?: string;
  inputSpec?: CommandInputSpec;
  outputType?: CommandOutputType;
  exitCodes?: ExitCodeSpec;
}

export class CliCommandDefinition {
  readonly commandName: CommandName;
  readonly description: string;
  readonly inputSpec: CommandInputSpec;
  readonly outputType: CommandOutputType;
  readonly exitCodes: ExitCodeSpec;

  private constructor(props: {
    commandName: CommandName;
    description: string;
    inputSpec: CommandInputSpec;
    outputType: CommandOutputType;
    exitCodes: ExitCodeSpec;
  }) {
    this.commandName = props.commandName;
    this.description = props.description;
    this.inputSpec = props.inputSpec;
    this.outputType = props.outputType;
    this.exitCodes = props.exitCodes;
    Object.freeze(this);
  }

  static create(
    commandName: CommandName,
    options?: {
      description?: string;
      inputSpec?: CommandInputSpec;
      outputType?: CommandOutputType;
      exitCodes?: ExitCodeSpec;
    }
  ): CliCommandDefinition {
    if (!commandName || !COMMAND_NAME_REGEX.test(commandName)) {
      throw new Error(`InvalidCommandNameError: invalid command name '${commandName}'. Must match ^harness:[a-z][a-z0-9-]*$`);
    }

    const outputType =
      options?.outputType ??
      (OUTPUT_TYPE_MAP[commandName] as CommandOutputType | undefined) ??
      'check-ready';

    return new CliCommandDefinition({
      commandName,
      description: options?.description ?? commandName,
      inputSpec: options?.inputSpec ?? CommandInputSpec.empty(),
      outputType,
      exitCodes: options?.exitCodes ?? ExitCodeSpec.standard(),
    });
  }

  equals(other: CliCommandDefinition): boolean {
    return this.commandName === other.commandName && this.outputType === other.outputType;
  }

  requiresArg(argName: string): boolean {
    return this.inputSpec.args.some((a) => a.name === argName && a.required === true);
  }

  hasFlag(flagName: string): boolean {
    return this.inputSpec.flags.some((f) => f.name === flagName);
  }
}
