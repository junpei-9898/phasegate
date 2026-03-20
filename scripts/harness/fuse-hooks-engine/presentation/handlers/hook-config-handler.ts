/**
 * @layer presentation
 * @unit fuse-hooks-engine
 */

import { HookConfigFormatter } from '../formatters/hook-config-formatter.js';

export class HookConfigHandler {
  private readonly formatter = new HookConfigFormatter();

  constructor(
    private readonly loadHookConfigUseCase: { execute(input: { yamlPath: string }): Promise<unknown> },
    private readonly validateHookYamlUseCase: { execute(input: { yamlPath: string }): Promise<unknown> },
  ) {}

  async handle(args: string[]): Promise<{ exitCode: number; output: string }> {
    const [subcommand, yamlPath = '.harness-hooks.yml'] = args;
    const result = subcommand === 'validate'
      ? await this.validateHookYamlUseCase.execute({ yamlPath })
      : await this.loadHookConfigUseCase.execute({ yamlPath });
    return {
      exitCode: 0,
      output: this.formatter.format(result),
    };
  }
}
