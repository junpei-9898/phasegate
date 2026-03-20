/**
 * @layer domain
 * @unit config-foundation
 */
export interface ConfigRepositoryPort {
  load(configPath?: string): Promise<{ path: string; document: unknown }>;
  save(configPath: string, document: unknown): Promise<void>;
}
