// @unit installation
// @layer infrastructure
// @work-item-id WI-330

import { access } from "node:fs/promises";
import { join } from "node:path";
import { createConfigFoundationModule } from "../../../config-foundation/composition-root.js";
import { ConfigValidationError } from "../../../config-foundation/domain/errors/config-validation-error.js";
import {
  ConfigNotFoundError,
  ConfigParseError,
} from "../../../config-foundation/infrastructure/repositories/file-system-config-repository.js";
import type { ConfigStatusProbePort } from "../../application/ports/config-status-probe-port.js";
import type { ConfigStatusProbeResult } from "../../domain/config-status.js";

const PROJECT_CONFIG_PATH = "phasegate.config.json";
const PERSONAL_CONFIG_PATH = join(".phasegate-local", "phasegate.config.json");

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * WI-330: doctor 用の config 状態 probe。
 *
 * FileSystemConfigRepository と同じ候補順（project 直下 → .phasegate-local/ の personal install）で
 * projectRoot 直下のみを解決する。cwd からの上方探索は行わない — doctor は「このプロジェクトの
 * config」を診断するため、親ディレクトリの config を拾うと診断が偽装される。
 * 妥当性判定は config-foundation の実 load 経路（JSON parse + AJV schema + preset 解決）を
 * そのまま使い、CLI 本体と同じ基準で invalid を検出する。
 */
export class ConfigStatusProbeAdapter implements ConfigStatusProbePort {
  private readonly cache = new Map<string, Promise<ConfigStatusProbeResult>>();

  probe(projectRoot: string): Promise<ConfigStatusProbeResult> {
    const cached = this.cache.get(projectRoot);
    if (cached !== undefined) {
      return cached;
    }
    const inspected = this.inspect(projectRoot);
    this.cache.set(projectRoot, inspected);
    return inspected;
  }

  private async inspect(projectRoot: string): Promise<ConfigStatusProbeResult> {
    for (const relativePath of [PROJECT_CONFIG_PATH, PERSONAL_CONFIG_PATH]) {
      const absolutePath = join(projectRoot, relativePath);
      if (await exists(absolutePath)) {
        return await this.classify(absolutePath, relativePath);
      }
    }
    return { status: "missing", configPath: PROJECT_CONFIG_PATH, detail: null };
  }

  private async classify(absolutePath: string, relativePath: string): Promise<ConfigStatusProbeResult> {
    try {
      await createConfigFoundationModule().usecases.loadResolvedConfigUseCase.execute(absolutePath);
      return { status: "valid", configPath: relativePath, detail: null };
    } catch (error) {
      if (error instanceof ConfigNotFoundError) {
        return { status: "missing", configPath: relativePath, detail: null };
      }
      if (error instanceof ConfigParseError) {
        const detail = error.cause instanceof Error ? error.cause.message : error.message;
        return { status: "invalid-json", configPath: relativePath, detail };
      }
      if (error instanceof ConfigValidationError) {
        return { status: "invalid-schema", configPath: relativePath, detail: error.message };
      }
      const detail = error instanceof Error ? error.message : String(error);
      return { status: "invalid-schema", configPath: relativePath, detail };
    }
  }
}
