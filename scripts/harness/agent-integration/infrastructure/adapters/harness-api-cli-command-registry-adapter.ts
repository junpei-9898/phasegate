/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * HarnessApiCliCommandRegistryAdapter
 * integration_contract.md §3.1 に定義されたCLIコマンドの静的リストを提供する
 */

import type { CliCommandRegistryPort } from '../../domain/ports/cli-command-registry-port.js';

/** integration_contract.md §3.1 に定義された登録済みコマンド一覧 */
const REGISTERED_COMMANDS: readonly string[] = [
  'phasegate:check-ready',
  'phasegate:check-phase',
  'phasegate:ci-check',
  'phasegate:detect-drift',
  'phasegate:status',
  'phasegate:lint',
  'phasegate:complete-check',
  'phasegate:impact-analysis',
  'phasegate:enable',
  'phasegate:disable',
];

const COMMAND_SET = new Set<string>(REGISTERED_COMMANDS);

export class HarnessApiCliCommandRegistryAdapter implements CliCommandRegistryPort {
  async hasCommand(commandName: string): Promise<boolean> {
    return COMMAND_SET.has(commandName);
  }

  async listCommands(): Promise<readonly string[]> {
    return REGISTERED_COMMANDS;
  }
}
