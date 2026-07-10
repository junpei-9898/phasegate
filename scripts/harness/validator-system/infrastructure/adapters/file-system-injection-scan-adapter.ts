// @unit validator-system
// @layer infrastructure
// @work-item-id WI-259

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { InjectionScanPolicyPort } from "../../domain/ports/injection-scan-policy-port.js";
import type { InjectionScanTarget } from "../../domain/value-objects/injection-scan-report.js";

const SKILLS_DIR = "skills";
const SKILL_FILE = "SKILL.md";
const AGENT_CONTEXT_REL = join("docs", "templates", "agent-context");

/** 固定パスの指示搭載ファイル（cwd 相対）。存在しなければ skip。 */
const FIXED_FILES: readonly string[] = ["CLAUDE.md", "AGENTS.md", join(".claude", "settings.json")];

/**
 * WI-259 / ADR-030 §Decision.3.④ — advisory インジェクションスキャナ（L3-006）の走査アダプタ。
 *
 * 指示搭載ファイル群を cwd 起点で列挙・読み込みして InjectionScanTarget[] を返す
 * （targetPaths 非依存の corpus 走査。L2-016 と同様に自前でファイル探索する）:
 * - `skills/*​/SKILL.md`（readdir）
 * - `CLAUDE.md` / `AGENTS.md` / `.claude/settings.json`（固定パス）
 * - `docs/templates/agent-context/*.md`（readdir）
 *
 * 不在ファイルは黙って skip する。path は project-relative（posix 区切り）で報告する。
 */
export class FileSystemInjectionScanAdapter implements InjectionScanPolicyPort {
  constructor(private readonly projectRoot: string) {}

  async collect(): Promise<readonly InjectionScanTarget[]> {
    const targets: InjectionScanTarget[] = [];

    // skills/*/SKILL.md
    const skillsRoot = join(this.projectRoot, SKILLS_DIR);
    let skillDirs: string[] = [];
    try {
      const entries = await readdir(skillsRoot, { withFileTypes: true });
      skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      skillDirs = [];
    }
    for (const dir of skillDirs) {
      const relPath = `${SKILLS_DIR}/${dir}/${SKILL_FILE}`;
      const target = await this.readTarget(join(skillsRoot, dir, SKILL_FILE), relPath);
      if (target) targets.push(target);
    }

    // docs/templates/agent-context/*.md
    const agentContextRoot = join(this.projectRoot, AGENT_CONTEXT_REL);
    let agentContextFiles: string[] = [];
    try {
      const entries = await readdir(agentContextRoot, { withFileTypes: true });
      agentContextFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name);
    } catch {
      agentContextFiles = [];
    }
    for (const name of agentContextFiles) {
      const relPath = `${AGENT_CONTEXT_REL.replace(/\\/g, "/")}/${name}`;
      const target = await this.readTarget(join(agentContextRoot, name), relPath);
      if (target) targets.push(target);
    }

    // 固定パス
    for (const rel of FIXED_FILES) {
      const posixRel = rel.replace(/\\/g, "/");
      const target = await this.readTarget(join(this.projectRoot, rel), posixRel);
      if (target) targets.push(target);
    }

    return Object.freeze(targets);
  }

  private async readTarget(absPath: string, relPath: string): Promise<InjectionScanTarget | null> {
    try {
      const content = await readFile(absPath, "utf-8");
      return { path: relPath, content };
    } catch {
      return null;
    }
  }
}
