/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-156
 * @work-item-id WI-212
 * @work-item-id WI-301
 * @work-item-id WI-302
 * @work-item-id WI-319
 *
 * HarnessConfigValidatorConfigAdapter — ValidatorConfigPort実装
 * HarnessConfigV2からLayerConfig VOを構築する
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ValidatorConfigPort } from "../../domain/ports/validator-config-port.js";
import { LayerConfig } from "../../domain/value-objects/layer-config.js";
import { ValidatorId } from "../../domain/value-objects/validator-id.js";

export interface HarnessConfigLayers {
  L2?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string };
  L3?: {
    enabled?: boolean;
    validators?: string[];
    strictOnly?: boolean;
    preset?: string;
    coverageThreshold?: number;
    bundleSizeLimit?: number;
  };
  L4?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string; deadCodeGC?: boolean };
}

export interface HarnessConfigV2Like {
  preset?: "minimal" | "standard" | "strict";
  project?: { preset?: "minimal" | "standard" | "strict"; languages?: readonly string[] };
  layers?: HarnessConfigLayers;
  harnesses?: {
    bundleSizeLimit?: number;
    deadCodeGC?: boolean;
  };
  world?: { enabled?: boolean };
}

/**
 * WI-319 (github#39): project.languages 未宣言時にファイルシステムから言語を検出するためのマーカー定義。
 * typescript は package.json の存在自体を根拠にできない（phasegate 導入時に phasegate 用
 * package.json が置かれるため）ので、この表には含めず hasTypescriptMarker() で個別判定する。
 */
const LANGUAGE_MARKER_FILES: ReadonlyArray<{ readonly language: string; readonly markers: readonly string[] }> = [
  { language: "python", markers: ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"] },
  { language: "go", markers: ["go.mod"] },
  { language: "rust", markers: ["Cargo.toml"] },
  { language: "java", markers: ["pom.xml", "build.gradle", "build.gradle.kts"] },
  { language: "ruby", markers: ["Gemfile"] },
  { language: "php", markers: ["composer.json"] },
];

export class HarnessConfigValidatorConfigAdapter implements ValidatorConfigPort {
  private readonly config: HarnessConfigV2Like;
  private readonly rootDir: string;

  constructor(config: HarnessConfigV2Like, rootDir: string = process.cwd()) {
    this.config = config;
    this.rootDir = rootDir;
  }

  async getLayerConfig(layer: "L2" | "L3" | "L4"): Promise<LayerConfig> {
    const preset = (this.config.project?.preset ?? this.config.preset ?? "standard") as
      | "minimal"
      | "standard"
      | "strict";
    const strictOnly = preset === "strict";
    const layerData = this.config.layers?.[layer] ?? {};

    const defaultValidators: Record<string, string[]> = {
      L2: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015"],
      L3: ["L3-001", "L3-002", "L3-003", "L3-004"],
      L4: ["L4-001", "L4-002", "L4-003", "L4-004", "L4-005", "L4-006"],
    };

    const thresholds: Record<string, number> = {};

    if (layer === "L3") {
      const l3 = this.config.layers?.L3;
      if (l3?.coverageThreshold !== undefined) thresholds.coverageThreshold = l3.coverageThreshold;
      if (l3?.bundleSizeLimit !== undefined) thresholds.bundleSizeLimit = l3.bundleSizeLimit;
      if (this.config.harnesses?.bundleSizeLimit !== undefined) {
        thresholds.bundleSizeLimit = this.config.harnesses.bundleSizeLimit;
      }
    }

    if (layer === "L4") {
      if (this.config.harnesses?.deadCodeGC !== undefined) {
        thresholds.deadCodeGC = this.config.harnesses.deadCodeGC ? 1 : 0;
      }
    }

    const configuredValidatorIds = layerData.validators ?? defaultValidators[layer];
    const automaticWorldValidatorId = layer === "L2" ? "L2-017" : layer === "L3" ? "L3-008" : null;
    const selectedValidatorIds =
      automaticWorldValidatorId === null
        ? configuredValidatorIds
        : this.config.world?.enabled === true
          ? [...configuredValidatorIds, automaticWorldValidatorId]
          : configuredValidatorIds.filter((validatorId) => validatorId !== automaticWorldValidatorId);
    return LayerConfig.create({
      layer,
      enabled: layerData.enabled !== false,
      validatorIds: [...new Set(selectedValidatorIds.map((idOrName) => this.normalizeValidatorId(idOrName)))],
      thresholds,
      strictOnly: layerData.strictOnly ?? strictOnly,
      preset,
    });
  }

  async getProjectLanguages(): Promise<readonly string[]> {
    // 1. config の project.languages 宣言が最優先（従来どおり）
    const languages = this.config.project?.languages;
    if (languages && languages.length > 0) return [...languages];

    // 2. 未宣言なら project root のマーカーファイルから検出（WI-319 / github#39）
    const detected = this.detectLanguagesFromFilesystem();
    if (detected.length > 0) return detected;

    // 3. 検出結果が空なら従来どおり typescript フォールバック
    //    （マーカー無しの純 JS リポジトリ等、曖昧なケースの挙動は変えない）
    return ["typescript"];
  }

  private detectLanguagesFromFilesystem(): string[] {
    const detected: string[] = [];
    if (this.hasTypescriptMarker()) detected.push("typescript");
    for (const { language, markers } of LANGUAGE_MARKER_FILES) {
      if (markers.some((marker) => existsSync(join(this.rootDir, marker)))) {
        detected.push(language);
      }
    }
    return detected;
  }

  /**
   * typescript の根拠は tsconfig.json の存在、または package.json の
   * dependencies / devDependencies に typescript があることのみ。
   * package.json の存在自体は根拠にしない（phasegate 導入時に phasegate 用
   * package.json が置かれるため、誤検出の原因になる）。
   */
  private hasTypescriptMarker(): boolean {
    if (existsSync(join(this.rootDir, "tsconfig.json"))) return true;
    const packageJsonPath = join(this.rootDir, "package.json");
    if (!existsSync(packageJsonPath)) return false;
    try {
      const parsed = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return parsed.dependencies?.typescript !== undefined || parsed.devDependencies?.typescript !== undefined;
    } catch {
      // parse 失敗は typescript 根拠なしとして扱う（throw しない）
      return false;
    }
  }

  private normalizeValidatorId(idOrName: string): string {
    try {
      return ValidatorId.create(idOrName).value;
    } catch {
      return ValidatorId.fromName(idOrName).value;
    }
  }
}
