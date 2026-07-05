// @unit attestation
// @layer infrastructure

import type { AcBoundAllowlistPort } from "../../application/ports/ac-bound-allowlist-port.js";

/**
 * AcBoundAllowlistPort の config-foundation 実装（H16-03 / WI-227）。
 * resolved config の `layers.L3.acBoundStories`（既定 []）を供給する。
 * config 不在・取得失敗時は [] を返す（acBoundScope は空になる）。
 */
export class ConfigAcBoundAllowlistAdapter implements AcBoundAllowlistPort {
  async getAcBoundStories(): Promise<readonly string[]> {
    try {
      const { createConfigFoundationModule } = await import("../../../config-foundation/composition-root.js");
      const configModule = createConfigFoundationModule();
      const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();
      const l3 = resolvedConfig.config.layers.L3 as { acBoundStories?: readonly string[] };
      return l3.acBoundStories ?? [];
    } catch {
      return [];
    }
  }
}
