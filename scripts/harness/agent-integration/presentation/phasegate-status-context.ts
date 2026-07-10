/**
 * @layer presentation
 * @unit agent-integration
 * @work-item-id WI-208
 *
 * Phasegate 状態を context 文字列として組み立てる共有ヘルパー。
 * SessionStart / UserPromptSubmit hook が共通で使用する。
 *
 * 副作用: phasegate.config.json の読み込み / docs/product/construction/ の走査のみ。
 */

import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface PhasegateConfig {
  protectedFiles?: {
    patterns?: string[];
    exclude?: string[];
  };
  project?: {
    paths?: {
      docs?: {
        construction?: string;
      };
    };
  };
}

export interface PhasegateStatus {
  configFound: boolean;
  protectedPatterns: readonly string[];
  blockedUnits: readonly string[];
}

export type ViolationType = "protected_file" | "phase_gate";

export interface RecentViolation {
  readonly type: ViolationType;
  readonly filePath: string;
  readonly detail: string;
}

const DEFAULT_PROTECTED_PATTERNS = [
  "biome.json",
  ".biome.json",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
] as const;

export async function findConfigPath(startDir: string): Promise<string | null> {
  let dir = startDir;
  while (true) {
    const candidates = [
      path.join(dir, "phasegate.config.json"),
      path.join(dir, ".phasegate-local", "phasegate.config.json"),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function projectRootForConfig(configPath: string): string {
  const configDir = path.dirname(configPath);
  return path.basename(configDir) === ".phasegate-local" ? path.dirname(configDir) : configDir;
}

async function loadConfig(configPath: string): Promise<PhasegateConfig> {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw) as PhasegateConfig;
  } catch {
    return {};
  }
}

function computeProtectedPatterns(config: PhasegateConfig): string[] {
  const additional = config.protectedFiles?.patterns ?? [];
  const exclude = new Set(config.protectedFiles?.exclude ?? []);
  const base = DEFAULT_PROTECTED_PATTERNS.filter((p) => !exclude.has(p));
  return [...base, ...additional];
}

async function findBlockedUnits(projectRoot: string, config: PhasegateConfig): Promise<string[]> {
  const constructionDir = config.project?.paths?.docs?.construction ?? path.join("docs", "product", "construction");
  const absConstructionDir = path.isAbsolute(constructionDir)
    ? constructionDir
    : path.join(projectRoot, constructionDir);

  try {
    await fs.access(absConstructionDir);
  } catch {
    return [];
  }

  let unitDirs: string[];
  try {
    const entries = await fs.readdir(absConstructionDir, { withFileTypes: true });
    unitDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const blocked: string[] = [];
  for (const unit of unitDirs) {
    const unitDir = path.join(absConstructionDir, unit);
    const hasLogicalDesign = await fs
      .access(path.join(unitDir, "logical_design.md"))
      .then(() => true)
      .catch(() => false);
    const hasDomainModel = await fs
      .access(path.join(unitDir, "domain_model.md"))
      .then(() => true)
      .catch(() => false);
    if (!hasLogicalDesign || !hasDomainModel) {
      const missing: string[] = [];
      if (!hasLogicalDesign) missing.push("logical_design.md");
      if (!hasDomainModel) missing.push("domain_model.md");
      blocked.push(`${unit} (missing: ${missing.join(", ")})`);
    }
  }
  return blocked;
}

export async function collectPhasegateStatus(cwd: string): Promise<PhasegateStatus> {
  const configPath = await findConfigPath(cwd);
  const configFound = configPath !== null;
  const config: PhasegateConfig = configFound ? await loadConfig(configPath) : {};
  const projectRoot = configFound ? projectRootForConfig(configPath) : cwd;

  const protectedPatterns = computeProtectedPatterns(config);
  const blockedUnits = await findBlockedUnits(projectRoot, config);

  return { configFound, protectedPatterns, blockedUnits };
}

/**
 * `git diff --name-only HEAD` で working tree + staged の変更ファイル一覧を取得する。
 * git 未初期化 / gitコマンド無しの場合は空配列を返す。
 */
async function getChangedFiles(projectRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync("git diff --name-only HEAD", {
      cwd: projectRoot,
      timeout: 5000,
    });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function matchesProtectedPattern(filePath: string, pattern: string): boolean {
  if (filePath === "") return false;
  if (pattern === filePath) return true;
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*")
    .replace(/\?/g, "[^/]");
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(filePath) || regex.test(path.basename(filePath));
}

/**
 * 現在の working tree (git diff HEAD) をスキャンし、保護ファイル違反 /
 * 既知の phase-gate ブロック Unit への書き込みを列挙する。
 *
 * ISSUE-013 Wave 3 / C-6 (軽量版): Codex のネイティブ apply_patch など hook を
 * バイパスする経路で起きた違反を、次ターン UserPromptSubmit で遅延検知する。
 */
export async function collectRecentViolations(
  projectRoot: string,
  status: PhasegateStatus,
): Promise<RecentViolation[]> {
  const changedFiles = await getChangedFiles(projectRoot);
  if (changedFiles.length === 0) return [];

  const violations: RecentViolation[] = [];
  const seen = new Set<string>();

  const blockedUnitNames = status.blockedUnits.map((entry) => entry.split(" ")[0]);

  for (const file of changedFiles) {
    // 保護ファイルチェック
    for (const pattern of status.protectedPatterns) {
      if (matchesProtectedPattern(file, pattern)) {
        const key = `protected:${file}`;
        if (!seen.has(key)) {
          seen.add(key);
          violations.push({
            type: "protected_file",
            filePath: file,
            detail: `matched pattern \`${pattern}\``,
          });
        }
        break;
      }
    }

    // 簡易 phase-gate チェック: 変更ファイルのパスに blocked unit 名が含まれるか
    for (const unitName of blockedUnitNames) {
      if (unitName.length === 0) continue;
      if (file.includes(`/${unitName}/`) || file.startsWith(`${unitName}/`)) {
        const key = `phase_gate:${file}:${unitName}`;
        if (!seen.has(key)) {
          seen.add(key);
          violations.push({
            type: "phase_gate",
            filePath: file,
            detail: `within blocked unit \`${unitName}\``,
          });
        }
        break;
      }
    }
  }

  return violations;
}

export function buildSessionStartContext(status: PhasegateStatus): string {
  const lines: string[] = [
    "# Phasegate status (auto-injected by SessionStart hook)",
    "",
    "This project uses Phasegate for AIDLC quality enforcement. Follow these rules:",
    "",
    "- Do NOT write to protected files without going through `/quick-implementor` skill.",
    '- Do NOT create/structurally modify source files under units listed as "blocked" below — the required design docs (logical_design.md / domain_model.md) are missing, and pre-tool-use hooks will block writes.',
    "- Prefer the native `apply_patch` tool for edits, BUT note that Codex's apply_patch bypasses pre-edit hooks. Violations surface at pre-commit time.",
    "",
  ];

  if (!status.configFound) {
    lines.push("_(phasegate.config.json not found — using default patterns.)_");
    lines.push("");
  }

  lines.push("## Protected files (pre-tool-use blocks writes to these)");
  if (status.protectedPatterns.length === 0) {
    lines.push("- (none)");
  } else {
    for (const p of status.protectedPatterns) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push("");

  lines.push("## Units currently blocked by phase-gate");
  if (status.blockedUnits.length === 0) {
    lines.push("- (none — all units have required design docs)");
  } else {
    for (const u of status.blockedUnits) {
      lines.push(`- ${u}`);
    }
  }
  lines.push("");
  lines.push(
    "If you attempt to write to a blocked unit, your edit will be rejected. Use the `/story-implementor` skill (Phase 1 planning first) to create the required design docs.",
  );

  return lines.join("\n");
}

/** integrity verify で検出した drift 1 件（agent-integration が依存を持たないよう構造だけ再掲） */
export interface IntegrityDriftLike {
  readonly path: string;
  readonly kind: "mismatch" | "added" | "missing" | "manifest-absent";
}

const INTEGRITY_DRIFT_LABEL: Record<IntegrityDriftLike["kind"], string> = {
  mismatch: "MISMATCH",
  added: "ADDED",
  missing: "MISSING",
  "manifest-absent": "MANIFEST-ABSENT",
};

/**
 * session-start hook が drift 検出時に additionalContext へ前置する警告ブロックを生成する純関数。
 * drift が空なら null（＝警告なし）を返す。warn-only（ADR-030 §Decision.3.① / §Decision.1）。
 *
 * `manifest-absent` のみの場合も null を返す（**未導入 = 沈黙**）: integrity pin を導入して
 * いないプロジェクトで毎セッション警告が出るのを防ぐ。manifest 欠落を drift として扱うのは
 * 明示実行の CLI `integrity:verify`（exit 2）の責務であり、session-start では警告しない。
 * manifest が存在する上での mismatch / added / missing は従来どおり警告する。
 */
export function buildIntegrityWarning(drifts: readonly IntegrityDriftLike[]): string | null {
  const warnable = drifts.filter((d) => d.kind !== "manifest-absent");
  if (warnable.length === 0) {
    return null;
  }

  const lines: string[] = [
    "# ⚠️ Phasegate integrity drift detected (SessionStart, warn-only)",
    "",
    "Instruction-carrying files (SKILL.md / hook config / husky / agent-context templates) differ from the pinned `phasegate.integrity.json`. This is a fast-path warning only and does NOT block the session. The authoritative check is the CI re-computation (ADR-030 §Decision.1).",
    "",
    "If these changes are intentional, run `phasegate integrity:pin` to update the manifest. If unexpected, they may indicate tampering by an injection-compromised agent — review before proceeding.",
    "",
  ];
  for (const drift of warnable) {
    lines.push(`- [${INTEGRITY_DRIFT_LABEL[drift.kind]}] \`${drift.path}\``);
  }
  return lines.join("\n");
}

/**
 * integrity verify が例外を投げて照合不能だった場合の fail-open 警告。
 */
export function buildIntegrityUnverifiableWarning(reason: string): string {
  return [
    "# ⚠️ Phasegate integrity check unavailable (SessionStart, warn-only)",
    "",
    `Could not verify instruction-file integrity: ${reason}. Continuing (fail-open) — local checks are fast-path only; CI is authoritative (ADR-030 §Decision.1).`,
  ].join("\n");
}

export function buildUserPromptSubmitContext(
  status: PhasegateStatus,
  violations: readonly RecentViolation[] = [],
): string {
  // UserPromptSubmit は毎ターン発火するため、簡潔に最新状態のみを通知する。
  // SessionStart で既に運用ルールは注入済みの前提。
  const lines: string[] = [
    "# Phasegate status refresh",
    "",
    `- Protected files (${status.protectedPatterns.length}): ${
      status.protectedPatterns.length === 0 ? "(none)" : status.protectedPatterns.map((p) => `\`${p}\``).join(", ")
    }`,
  ];

  if (status.blockedUnits.length === 0) {
    lines.push("- Phase-gate: all units unlocked (no missing logical_design.md / domain_model.md)");
  } else {
    lines.push(`- Phase-gate: ${status.blockedUnits.length} unit(s) currently blocked — writes will be rejected:`);
    for (const u of status.blockedUnits) {
      lines.push(`  - ${u}`);
    }
    lines.push("  Use `/story-implementor` to create the missing design docs.");
  }

  if (violations.length > 0) {
    lines.push("");
    lines.push(`## ⚠️ Phasegate violations detected in current working tree (${violations.length})`);
    lines.push("");
    lines.push(
      "These changes violate Phasegate rules and WILL be blocked at pre-commit time. Native `apply_patch` edits bypass pre-edit hooks, so this turn-boundary check is the only early warning. Consider reverting with `git checkout <file>` or `git restore <file>` if unintended.",
    );
    lines.push("");
    for (const v of violations) {
      const label = v.type === "protected_file" ? "PROTECTED FILE" : "PHASE-GATE";
      lines.push(`- [${label}] \`${v.filePath}\` — ${v.detail}`);
    }
  }

  return lines.join("\n");
}
