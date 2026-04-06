// @layer application
// command-dispatch-input.ts — CommandDispatchInput DTO

export interface CommandDispatchInput {
  commandName: string;
  args: Record<string, string>;
  flags: Record<string, boolean | string>;
}
