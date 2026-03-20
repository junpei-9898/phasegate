// initialize-registry-input.ts — InitializeRegistryInput DTO

export interface CliCommandDefinitionInput {
  commandName: string;
  description?: string;
  handler?: unknown;
}

export interface InitializeRegistryInput {
  commands: readonly CliCommandDefinitionInput[];
}
