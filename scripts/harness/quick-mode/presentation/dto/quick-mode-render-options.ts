/**
 * @layer presentation
 * @unit quick-mode
 *
 * Quick Mode表示オプション DTO
 */

export interface QuickModeRenderOptions {
  readonly quick: boolean;
  readonly files?: string;
  readonly dryRun?: boolean;
  readonly format?: 'human' | 'agent' | 'json';
  readonly failOnReject?: boolean;
}
