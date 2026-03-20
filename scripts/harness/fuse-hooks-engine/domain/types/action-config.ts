/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export interface BlockWriteConfig {
  reason: string;
  notifyUser: boolean;
}

export interface AllowReadConfig {
  maxAccessCount?: number;
}

export interface RunShellConfig {
  script: string;
  timeout?: number;
  failOnNonZero: boolean;
}

export interface TriggerCompletionConfig {
  gateId: string;
}

export type ActionConfig =
  | BlockWriteConfig
  | AllowReadConfig
  | RunShellConfig
  | TriggerCompletionConfig;
