/**
 * @layer domain
 * @unit agent-integration
 */

export interface CliCommandRegistryPort {
  hasCommand(commandName: string): Promise<boolean>;
  listCommands(): Promise<readonly string[]>;
}
