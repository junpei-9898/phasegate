/**
 * @layer application
 * @unit biome-ast-engine
 */

export type ResolveEnabledRulesInput = {
  readonly overrideRules?: Readonly<Record<string, 'error' | 'warning' | 'off'>>;
};
