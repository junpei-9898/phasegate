// @unit agent-integration
// @layer infrastructure

import type {
  BaselineGrandfatherQueryPort,
  BaselineGrandfatherCheckResult,
} from '../../domain/ports/baseline-grandfather-query-port.js';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { BaselineRepositoryPort } from '../../../ci-governance/domain/ports/baseline-repository-port.js';
import { BaselineJsonRepositoryAdapter } from '../../../ci-governance/infrastructure/adapters/baseline-json-repository-adapter.js';
import type { FileHasherPort } from '../../../ci-governance/domain/ports/file-hasher-port.js';
import { FileSystemSha1HasherAdapter } from '../../../ci-governance/infrastructure/adapters/file-system-sha1-hasher-adapter.js';

export interface CiGovernanceBaselineGrandfatherAdapterDeps {
  readonly baseDir: string;
  readonly configQueryPort: ConfigQueryPort;
  readonly baselineRepositoryFactory?: (
    baseDir: string,
    relativePath: string,
  ) => BaselineRepositoryPort;
  readonly fileHasherFactory?: (baseDir: string) => FileHasherPort;
}

export class CiGovernanceBaselineGrandfatherAdapter
  implements BaselineGrandfatherQueryPort
{
  constructor(private readonly deps: CiGovernanceBaselineGrandfatherAdapterDeps) {}

  async check(
    targetFilePaths: readonly string[],
  ): Promise<BaselineGrandfatherCheckResult> {
    try {
      const baselineConfig = await this.deps.configQueryPort.getBaselineConfig();

      if (!baselineConfig.enabled) {
        return {
          allGrandfathered: false,
          baselineEnabled: false,
          grandfatheredPaths: [],
        };
      }

      if (targetFilePaths.length === 0) {
        return {
          allGrandfathered: false,
          baselineEnabled: true,
          grandfatheredPaths: [],
        };
      }

      const factory =
        this.deps.baselineRepositoryFactory ??
        ((baseDir, relativePath) =>
          new BaselineJsonRepositoryAdapter(baseDir, relativePath));
      const repository = factory(this.deps.baseDir, baselineConfig.path);

      if (!(await repository.exists())) {
        return {
          allGrandfathered: false,
          baselineEnabled: true,
          grandfatheredPaths: [],
        };
      }

      const snapshot = await repository.load();
      if (snapshot === null) {
        return {
          allGrandfathered: false,
          baselineEnabled: true,
          grandfatheredPaths: [],
        };
      }

      // 整合性検証: baseline に path が載っているだけでは grandfather しない。
      // 記録済み sha1 と実ファイルの sha1 が一致する場合のみ grandfather 扱いとする。
      // これにより baseline.json への手動 path 追記による bypass を防ぐ
      //（追記側は実ファイルの正しい sha1 を予測できず、改変後の content とも一致しない）。
      const hasherFactory =
        this.deps.fileHasherFactory ??
        ((baseDir) => new FileSystemSha1HasherAdapter(baseDir));
      const hasher = hasherFactory(this.deps.baseDir);
      const entryByPath = new Map(snapshot.entries.map((e) => [e.path, e.sha1] as const));

      const grandfathered: string[] = [];
      for (const p of targetFilePaths) {
        const recordedSha1 = entryByPath.get(p);
        if (recordedSha1 === undefined) continue;
        let actualSha1: string;
        try {
          actualSha1 = await hasher.hashFile(p);
        } catch {
          // ファイル読み取り失敗 (未作成・権限等) は grandfather 不可扱い (保護側に倒す)
          continue;
        }
        if (actualSha1 === recordedSha1) grandfathered.push(p);
      }
      const allGrandfathered =
        targetFilePaths.length > 0 && grandfathered.length === targetFilePaths.length;

      return {
        allGrandfathered,
        baselineEnabled: true,
        grandfatheredPaths: grandfathered,
      };
    } catch {
      return {
        allGrandfathered: false,
        baselineEnabled: false,
        grandfatheredPaths: [],
      };
    }
  }
}
