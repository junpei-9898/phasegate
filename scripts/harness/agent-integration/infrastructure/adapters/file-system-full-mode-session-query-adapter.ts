// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-206
// @work-item-id WI-348
// @work-item-id WI-350

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ConfigQueryPort } from "../../domain/ports/config-query-port.js";
import type {
  FullModeSessionQueryInput,
  FullModeSessionQueryPort,
  FullModeSessionQueryResult,
} from "../../domain/ports/full-mode-session-query-port.js";
import { WriteTargetScope } from "../../domain/value-objects/write-target-scope.js";

/**
 * quick-mode の `ChangeCategoryValue` と同一の語彙。
 * 照合相手は quick-mode 分類結果（`dominantCategory`）なので、この語彙以外は
 * session.json 側の書式誤りとして扱う。
 * `session begin` 側との同期は
 * `__tests__/integration/harness-api/session-begin-allowed-categories.integration.test.ts`
 * が検証する（WI-348）。
 */
const KNOWN_CHANGE_CATEGORIES: ReadonlySet<string> = new Set([
  "bugfix",
  "docs",
  "test",
  "config",
  "feature",
  "domain",
  "api",
]);

/**
 * WI-348: v0.301.0 以前の `phasegate session begin` は allowedCategories に
 * レイヤー名（domain / application / infrastructure / presentation / config）を
 * 書き出していた。この語彙は ChangeCategory と domain / config でしか交差せず、
 * 旧形式 session.json をそのまま照合すると feature / api / bugfix などが
 * 恒常的に拒否され session が事実上無力化する。
 *
 * `session begin` はカテゴリ指定フラグを持たず常に定数を書き出すため、
 * 「ChangeCategory 語彙に無い値が混ざっている」= 旧形式生成物と判断できる。
 * その場合のみ全カテゴリ許可へ正規化する。
 * 全要素が既知カテゴリなら手編集による意図的な絞り込みとみなし原文を尊重する。
 * unit / 期限 / target path のスコープ判定は正規化後も従来どおり効く。
 */
function normalizeAllowedCategories(rawCategories: readonly string[]): readonly string[] {
  if (rawCategories.length === 0) {
    return rawCategories;
  }
  if (rawCategories.every((value) => KNOWN_CHANGE_CATEGORIES.has(value))) {
    return rawCategories;
  }
  return [...KNOWN_CHANGE_CATEGORIES];
}

interface FullModeSessionDocument {
  readonly mode?: unknown;
  readonly unit?: unknown;
  readonly workItemId?: unknown;
  readonly allowedCategories?: unknown;
  readonly reason?: unknown;
  readonly startedAt?: unknown;
  readonly expiresAt?: unknown;
}

export class FileSystemFullModeSessionQueryAdapter implements FullModeSessionQueryPort {
  constructor(
    private readonly options: {
      readonly rootDir: string;
      readonly configQueryPort: ConfigQueryPort;
      readonly now?: () => Date;
    },
  ) {}

  async check(input: FullModeSessionQueryInput): Promise<FullModeSessionQueryResult> {
    let document: FullModeSessionDocument;
    try {
      const raw = await fs.readFile(path.join(this.options.rootDir, ".phasegate", "session.json"), "utf8");
      document = JSON.parse(raw) as FullModeSessionDocument;
    } catch {
      return { active: false, allowed: false, reason: "session marker not found or unreadable" };
    }

    if (document.mode !== "full") {
      return { active: false, allowed: false, reason: "session mode is not full" };
    }
    if (typeof document.unit !== "string" || document.unit === "") {
      return { active: true, allowed: false, reason: "session unit is missing" };
    }
    if (typeof document.workItemId !== "string" || !/^WI-\d+$/.test(document.workItemId)) {
      return { active: true, allowed: false, reason: "session work item is invalid" };
    }
    if (typeof document.expiresAt !== "string" || Number.isNaN(Date.parse(document.expiresAt))) {
      return { active: true, allowed: false, reason: "session expiry is invalid" };
    }
    if ((this.options.now?.() ?? new Date()).getTime() >= Date.parse(document.expiresAt)) {
      return {
        active: true,
        allowed: false,
        reason: "session expired",
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }
    if (
      !Array.isArray(document.allowedCategories) ||
      document.allowedCategories.some((value) => typeof value !== "string")
    ) {
      return { active: true, allowed: false, reason: "session allowedCategories is invalid" };
    }
    const allowedCategories = normalizeAllowedCategories(document.allowedCategories as readonly string[]);
    if (input.dominantCategory === undefined || !allowedCategories.includes(input.dominantCategory)) {
      return {
        active: true,
        allowed: false,
        reason: `category ${input.dominantCategory ?? "<unknown>"} is not allowed by session`,
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }
    // WI-350: unit を持たないパス（プロジェクト直下のファイル・__tests__ 配下など）は
    // 集約 unitId が undefined になる。旧実装はこれを即拒否していたが、
    // 直下の allTargetPathsBelongToUnit は unitless パスを許容しており内部矛盾していた。
    // 集約チェックは「unitId が定義済みかつ session unit と不一致」の場合のみ拒否し、
    // unitless は per-path チェックへ委ねる。unit 付きパスが 1 つでも混ざれば
    // per-path 側が従来どおり拒否するため、unit 境界は緩まない。
    if (input.unitId !== undefined && input.unitId !== document.unit) {
      return {
        active: true,
        allowed: false,
        reason: `target unit ${input.unitId} does not match session unit ${document.unit}`,
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }
    if (!this.allTargetPathsBelongToUnit(input.targetFilePaths, document.unit)) {
      return {
        active: true,
        allowed: false,
        reason: `one or more target paths are outside session unit ${document.unit}`,
        workItemId: document.workItemId,
        unit: document.unit,
        expiresAt: document.expiresAt,
      };
    }

    return {
      active: true,
      allowed: true,
      workItemId: document.workItemId,
      unit: document.unit,
      expiresAt: document.expiresAt,
    };
  }

  private allTargetPathsBelongToUnit(targetFilePaths: readonly string[], unit: string): boolean {
    const projectPaths = this.options.configQueryPort.getProjectPaths();
    for (const targetFilePath of targetFilePaths) {
      const scope = WriteTargetScope.fromPath(targetFilePath, projectPaths);
      if (scope?.unitId !== undefined && scope.unitId !== unit) {
        return false;
      }
    }
    return true;
  }
}
