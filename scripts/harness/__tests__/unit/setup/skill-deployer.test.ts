// @unit harness-api
// @layer test
// @story H13-04
// @work-item-id WI-141
// @work-item-id WI-184
// @work-item-id WI-202
// @work-item-id WI-214
import { access, lstat, mkdir, mkdtemp, readFile, readlink, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  deployAgentSkillLinks,
  deployCiWorkflows,
  deployDesignDocs,
  deployHuskyCommitMsgHook,
  deployHuskyHook,
  deployHuskyPrePushHook,
  deploySkills,
  getCategoryForSkill,
  getSkillMarkdownPath,
  getSkillsForSet,
  initHarnessConfig,
  listAvailableSkillNames,
  renderSkillForModelDelegation,
  SKILL_CATEGORIES,
} from "../../../setup/skill-deployer.js";
import { context, target } from "../../helpers/test-helpers.ts";

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), "skill-deployer-test-"));

  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function readGeneratedConfig(projectRoot: string): Promise<{
  phaseDependencies: { preset: string };
  quickMode?: { allowedCategories?: string[]; relaxedGates?: string[] };
  ci?: { enabled?: boolean };
  modelRouting?: { delegation?: string };
}> {
  const raw = await readFile(join(projectRoot, "phasegate.config.json"), "utf-8");
  return JSON.parse(raw) as { phaseDependencies: { preset: string } };
}

target("initHarnessConfig", () => {
  describe("phaseDependencies.preset を生成する", () => {
    context("phasePreset を指定しない場合", () => {
      it("default が書き込まれること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName);
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe("default");
      });
    });

    context("phasePreset に full を指定する場合", () => {
      it("full が書き込まれること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, "full");
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe("full");
      });
    });

    context("phasePreset に standard を指定する場合", () => {
      it("standard が書き込まれること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, "standard");
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe("standard");
      });
    });

    context("phasePreset に custom を指定する場合", () => {
      it("custom が書き込まれること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, "custom");
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.phaseDependencies.preset).toBe("custom");
      });
    });

    context("ciEnabled を指定する場合", () => {
      it("ci.enabled=true が書き込まれること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, undefined, { ciEnabled: true });
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.ci?.enabled).toBe(true);
      });
    });

    context("modelRouting を指定しない場合", () => {
      it("delegate-sonnet が既定値として書き込まれること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName);
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.modelRouting?.delegation).toBe("delegate-sonnet");
      });
    });

    context("strict workflow を指定する場合", () => {
      it("quick-implementor と整合する Quick Mode category を生成し relaxedGates は空にすること", async () => {
        // Arrange
        const projectName = "my-project";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await initHarnessConfig(projectRoot, projectName, undefined, { workflow: "strict" });
          return readGeneratedConfig(projectRoot);
        });

        // Assert
        expect(actual.quickMode?.allowedCategories).toEqual(["bugfix", "docs", "test", "config"]);
        expect(actual.quickMode?.relaxedGates).toEqual([]);
      });
    });
  });
});

target("renderSkillForModelDelegation", () => {
  describe("modelRouting.delegation=none 用に skill を描画する", () => {
    context("Sonnet delegation を含む SKILL.md の場合", () => {
      it("model/review frontmatter と delegate-sonnet 参照を除去すること", () => {
        // Arrange
        const content = `---
name: sample
model: sonnet
review: opus
---

- **Phase 1（計画）**: Opus がスコープを整理する
- **Phase 2（実行）**: 委任先モデルに委任して成果物を生成する（\`npx phasegate delegate-sonnet\` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証する
`;

        // Act
        const actual = renderSkillForModelDelegation(content, "none");

        // Assert
        expect(actual).not.toContain("model: sonnet");
        expect(actual).not.toContain("review: opus");
        expect(actual).not.toContain("delegate-sonnet");
        expect(actual).not.toContain("委任先モデル");
        expect(actual).toContain("メインセッションが成果物を生成する");
      });
    });
  });
});

target("deployCiWorkflows", () => {
  describe("CI workflow をデプロイする", () => {
    context("空のプロジェクトに対して呼ぶと", () => {
      it("aidlc-gate と consistency-check と agent-context-refresh が作成されること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployCiWorkflows(harnessRoot, projectRoot);
          await access(join(projectRoot, ".github/workflows/aidlc-gate.yml"));
          await access(join(projectRoot, ".github/workflows/consistency-check.yml"));
          await access(join(projectRoot, ".github/workflows/agent-context-refresh.yml"));
          return result;
        });

        // Assert
        expect(actual).toEqual({
          copiedFiles: [
            ".github/workflows/aidlc-gate.yml",
            ".github/workflows/consistency-check.yml",
            ".github/workflows/agent-context-refresh.yml",
          ],
          skippedFiles: [],
        });
      });
    });

    context("phasegate.config.json に docs 配置パスが指定されている場合", () => {
      it("principles と folder rules を設定パスにコピーすること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await writeFile(
            join(projectRoot, "phasegate.config.json"),
            JSON.stringify({
              paths: {
                principlesDocs: "documentation/principles",
                folderRulesDoc: "documentation/folder_rules.md",
              },
            }),
            "utf-8",
          );

          const result = await deployDesignDocs(harnessRoot, projectRoot);

          await Promise.all([
            access(join(projectRoot, "documentation/folder_rules.md")),
            access(join(projectRoot, "documentation/principles/architecture-philosophy.md")),
            access(join(projectRoot, "documentation/principles/model-routing.md")),
            access(join(projectRoot, "documentation/principles/testing-rules.md")),
          ]);

          return result;
        });

        // Assert
        expect(actual).toEqual({
          copiedFiles: [
            "documentation/folder_rules.md",
            "documentation/principles/architecture-philosophy.md",
            "documentation/principles/model-routing.md",
            "documentation/principles/testing-rules.md",
          ],
          skippedFiles: [],
        });
      });
    });

    context("既に workflow が存在する場合", () => {
      it("既存ファイルを上書きせず skippedFiles に含めること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, ".github/workflows"), { recursive: true });
          await writeFile(join(projectRoot, ".github/workflows/aidlc-gate.yml"), "existing workflow\n", "utf-8");

          const result = await deployCiWorkflows(harnessRoot, projectRoot);
          const content = await readFile(join(projectRoot, ".github/workflows/aidlc-gate.yml"), "utf-8");

          return { result, content };
        });

        // Assert
        expect(actual.content).toBe("existing workflow\n");
        expect(actual.result.skippedFiles).toContain(".github/workflows/aidlc-gate.yml");
        expect(actual.result.copiedFiles).toContain(".github/workflows/consistency-check.yml");
        expect(actual.result.copiedFiles).toContain(".github/workflows/agent-context-refresh.yml");
      });
    });
  });
});

target("deployHuskyCommitMsgHook", () => {
  describe("husky commit-msg フックをデプロイする", () => {
    context("空のプロジェクトに対して呼ぶと", () => {
      it(".husky/commit-msg が作成されて created: true を返すこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployHuskyCommitMsgHook(harnessRoot, projectRoot);
          await access(join(projectRoot, ".husky/commit-msg"));
          return result;
        });

        // Assert
        expect(actual).toEqual({
          created: true,
          path: actual.path,
        });
      });

      it(".husky/commit-msg に実行権限 (0o755) が付与されること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployHuskyCommitMsgHook(harnessRoot, projectRoot);
          const fileStats = await stat(join(projectRoot, ".husky/commit-msg"));
          return { result, mode: fileStats.mode & 0o777 };
        });

        // Assert
        expect(actual).toEqual({
          result: {
            created: true,
            path: actual.result.path,
          },
          mode: 0o755,
        });
      });
    });

    context("既に .husky/commit-msg が存在する場合", () => {
      it("スキップされ created: false を返すこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, ".husky"), { recursive: true });
          await writeFile(join(projectRoot, ".husky/commit-msg"), "existing hook\n", "utf-8");

          return deployHuskyCommitMsgHook(harnessRoot, projectRoot);
        });

        // Assert
        expect(actual).toEqual({
          created: false,
          path: actual.path,
        });
      });

      it("内容が上書きされないこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, ".husky"), { recursive: true });
          await writeFile(join(projectRoot, ".husky/commit-msg"), "existing hook\n", "utf-8");

          await deployHuskyCommitMsgHook(harnessRoot, projectRoot);

          return readFile(join(projectRoot, ".husky/commit-msg"), "utf-8");
        });

        // Assert
        expect(actual).toBe("existing hook\n");
      });
    });
  });
});

target("deployHuskyPrePushHook", () => {
  describe("husky pre-push フックをデプロイする", () => {
    context("空のプロジェクトに対して呼ぶと", () => {
      it(".husky/pre-push が作成されて created: true を返すこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployHuskyPrePushHook(harnessRoot, projectRoot);
          await access(join(projectRoot, ".husky/pre-push"));
          return result;
        });

        // Assert
        expect(actual).toEqual({
          created: true,
          path: actual.path,
        });
      });

      it(".husky/pre-push に実行権限 (0o755) が付与されること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployHuskyPrePushHook(harnessRoot, projectRoot);
          const fileStats = await stat(join(projectRoot, ".husky/pre-push"));
          return { result, mode: fileStats.mode & 0o777 };
        });

        // Assert
        expect(actual).toEqual({
          result: {
            created: true,
            path: actual.result.path,
          },
          mode: 0o755,
        });
      });
    });

    context("既に .husky/pre-push が存在する場合", () => {
      it("スキップされ created: false を返すこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, ".husky"), { recursive: true });
          await writeFile(join(projectRoot, ".husky/pre-push"), "existing hook\n", "utf-8");

          return deployHuskyPrePushHook(harnessRoot, projectRoot);
        });

        // Assert
        expect(actual).toEqual({
          created: false,
          path: actual.path,
        });
      });
    });
  });
});

target("deploySkills / deployAgentSkillLinks", () => {
  describe("共有 skill 実体と agent 導線をデプロイする", () => {
    context("空のプロジェクトに対して skill を配置する場合", () => {
      it("skills/.harness-version が project root に作成されること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await deploySkills(harnessRoot, projectRoot, "core");
          await access(join(projectRoot, "skills", ".harness-version"));
          return "deployed";
        });

        // Assert
        expect(actual).toBe("deployed");
      });

      it(".claude/skills と .codex/skills の symlink を作成できること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await deploySkills(harnessRoot, projectRoot, "core");
          const result = await deployAgentSkillLinks(projectRoot, { claude: true, codex: true });
          const claudeStats = await lstat(join(projectRoot, ".claude", "skills"));
          const codexStats = await lstat(join(projectRoot, ".codex", "skills"));
          const claudeTarget = await readlink(join(projectRoot, ".claude", "skills"));
          const codexTarget = await readlink(join(projectRoot, ".codex", "skills"));
          return { result, claudeStats, codexStats, claudeTarget, codexTarget };
        });

        // Assert
        expect(actual.result.claude?.created).toBe(true);
        expect(actual.result.codex?.created).toBe(true);
        expect(actual.claudeStats.isSymbolicLink()).toBe(true);
        expect(actual.codexStats.isSymbolicLink()).toBe(true);
        expect(actual.claudeTarget).toBe("../skills");
        expect(actual.codexTarget).toBe("../skills");
      });

      it("modelRouting.delegation=none の場合は配備先 skill から固定委任を除去すること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await writeFile(
            join(projectRoot, "phasegate.config.json"),
            JSON.stringify({ modelRouting: { delegation: "none" } }, null, 2),
            "utf-8",
          );
          await deploySkills(harnessRoot, projectRoot, "all");
          return readFile(join(projectRoot, "skills", "it-test-designer", "SKILL.md"), "utf-8");
        });

        // Assert
        expect(actual).not.toContain("model: sonnet");
        expect(actual).not.toContain("review: opus");
        expect(actual).not.toContain("delegate-sonnet");
        expect(actual).toContain("メインセッションが成果物を生成する");
      });
    });
  });
});

target("deployDesignDocs", () => {
  describe("設計原則ドキュメントをデプロイする", () => {
    context("空のプロジェクトに対して呼ぶと", () => {
      it("4 ファイル全てがコピーされること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await deployDesignDocs(harnessRoot, projectRoot);

          await Promise.all([
            access(join(projectRoot, "docs/folder_management_rules.md")),
            access(join(projectRoot, "docs/principles/architecture-philosophy.md")),
            access(join(projectRoot, "docs/principles/model-routing.md")),
            access(join(projectRoot, "docs/principles/testing-rules.md")),
          ]);

          return "copied";
        });

        // Assert
        expect(actual).toBe("copied");
      });

      it("copiedFiles に 4 ファイル全てが含まれ skippedFiles が空であること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => deployDesignDocs(harnessRoot, projectRoot));

        // Assert
        expect(actual).toEqual({
          copiedFiles: [
            "docs/folder_management_rules.md",
            "docs/principles/architecture-philosophy.md",
            "docs/principles/model-routing.md",
            "docs/principles/testing-rules.md",
          ],
          skippedFiles: [],
        });
      });
    });

    context("既に docs/folder_management_rules.md が存在する場合", () => {
      it("そのファイルはスキップされ skippedFiles に含まれること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, "docs"), { recursive: true });
          await writeFile(join(projectRoot, "docs/folder_management_rules.md"), "existing folder rules\n", "utf-8");

          return deployDesignDocs(harnessRoot, projectRoot);
        });

        // Assert
        expect(actual.skippedFiles).toContain("docs/folder_management_rules.md");
      });
    });

    context("既に docs/principles/testing-rules.md が存在する場合", () => {
      it("そのファイルはスキップされ他のprinciplesファイルはコピーされること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, "docs/principles"), { recursive: true });
          await writeFile(join(projectRoot, "docs/principles/testing-rules.md"), "existing testing rules\n", "utf-8");

          const result = await deployDesignDocs(harnessRoot, projectRoot);
          await access(join(projectRoot, "docs/principles/architecture-philosophy.md"));
          await access(join(projectRoot, "docs/principles/model-routing.md"));

          return result;
        });

        // Assert
        expect(actual).toEqual({
          copiedFiles: [
            "docs/folder_management_rules.md",
            "docs/principles/architecture-philosophy.md",
            "docs/principles/model-routing.md",
          ],
          skippedFiles: ["docs/principles/testing-rules.md"],
        });
      });
    });
  });
});

target("SKILL_CATEGORIES / getSkillsForSet (WI-088 guidance category)", () => {
  describe("guidance カテゴリの登録", () => {
    context("SKILL_CATEGORIES に guidance キーを追加した場合", () => {
      it("phasegate-toolkit-guide が guidance カテゴリ配下に登録されていること", () => {
        // Arrange & Act
        const actual = SKILL_CATEGORIES.guidance;

        // Assert
        expect(actual).toContain("phasegate-toolkit-guide");
      });

      it("phasegate-config-doctor が guidance カテゴリ配下に登録されていること", () => {
        // Arrange & Act
        const actual = SKILL_CATEGORIES.guidance;

        // Assert
        expect(actual).toContain("phasegate-config-doctor");
      });
    });

    context("getCategoryForSkill('phasegate-toolkit-guide') 呼び出し時", () => {
      it("guidance カテゴリを返すこと", () => {
        // Arrange & Act
        const actual = getCategoryForSkill("phasegate-toolkit-guide");

        // Assert
        expect(actual).toBe("guidance");
      });
    });

    context("getCategoryForSkill('phasegate-config-doctor') 呼び出し時", () => {
      it("guidance カテゴリを返すこと", () => {
        // Arrange & Act
        const actual = getCategoryForSkill("phasegate-config-doctor");

        // Assert
        expect(actual).toBe("guidance");
      });
    });
  });

  describe("getSkillsForSet の skillSet 別返り値", () => {
    context("skillSet='all' を指定した場合", () => {
      it("phasegate-toolkit-guide が含まれること", () => {
        // Arrange & Act
        const actual = getSkillsForSet("all");

        // Assert
        expect(actual).toContain("phasegate-toolkit-guide");
      });

      it("phasegate-config-doctor が含まれること", () => {
        // Arrange & Act
        const actual = getSkillsForSet("all");

        // Assert
        expect(actual).toContain("phasegate-config-doctor");
      });
    });

    context("skillSet='core' を指定した場合", () => {
      it("phasegate-toolkit-guide が含まれないこと（guidance は core に属さない）", () => {
        // Arrange & Act
        const actual = getSkillsForSet("core");

        // Assert
        expect(actual).not.toContain("phasegate-toolkit-guide");
      });

      it("phasegate-config-doctor が含まれないこと（guidance は core に属さない）", () => {
        // Arrange & Act
        const actual = getSkillsForSet("core");

        // Assert
        expect(actual).not.toContain("phasegate-config-doctor");
      });
    });
  });
});

target("skill catalog source helpers (WI-184)", () => {
  describe("listAvailableSkillNames", () => {
    context("skills directory does not exist", () => {
      it("空配列を返し undefined accumulator に依存しないこと", async () => {
        // Arrange
        const expectedSkills: string[] = [];

        // Act
        const actual = await withTempProject((projectRoot) => listAvailableSkillNames(projectRoot));

        // Assert
        expect(actual).toEqual(expectedSkills);
      });
    });

    context("SKILL.md を持つ skill directory が存在する場合", () => {
      it("skills info と同じ SKILL.md path source から catalog 名を列挙すること", async () => {
        // Arrange
        const skillName = "alpha";

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, "skills", skillName), { recursive: true });
          await mkdir(join(projectRoot, "skills", "without-skill-md"), { recursive: true });
          await writeFile(getSkillMarkdownPath(projectRoot, skillName), "# Alpha\n");

          return {
            listed: await listAvailableSkillNames(projectRoot),
            skillMarkdownPath: getSkillMarkdownPath(projectRoot, skillName),
            expectedSkillMarkdownPath: join(projectRoot, "skills", skillName, "SKILL.md"),
          };
        });

        // Assert
        expect(actual.listed).toEqual(["alpha"]);
        expect(actual.skillMarkdownPath).toBe(actual.expectedSkillMarkdownPath);
      });
    });
  });
});

target("deployHuskyHook", () => {
  describe("husky pre-commit フックをデプロイする", () => {
    context("空のプロジェクトに対して呼ぶと", () => {
      it(".husky/pre-commit が作成されて created: true を返すこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployHuskyHook(harnessRoot, projectRoot);
          await access(join(projectRoot, ".husky/pre-commit"));
          return result;
        });

        // Assert
        expect(actual).toEqual({
          created: true,
          path: actual.path,
        });
      });

      it(".husky/pre-commit に実行権限 (0o755) が付与されること", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const result = await deployHuskyHook(harnessRoot, projectRoot);
          const fileStats = await stat(join(projectRoot, ".husky/pre-commit"));
          return { result, mode: fileStats.mode & 0o777 };
        });

        // Assert
        expect(actual).toEqual({
          result: {
            created: true,
            path: actual.result.path,
          },
          mode: 0o755,
        });
      });
    });

    context("既に .husky/pre-commit が存在する場合", () => {
      it("スキップされ created: false を返すこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, ".husky"), { recursive: true });
          await writeFile(join(projectRoot, ".husky/pre-commit"), "existing hook\n", "utf-8");

          return deployHuskyHook(harnessRoot, projectRoot);
        });

        // Assert
        expect(actual).toEqual({
          created: false,
          path: actual.path,
        });
      });

      it("内容が上書きされないこと", async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await mkdir(join(projectRoot, ".husky"), { recursive: true });
          await writeFile(join(projectRoot, ".husky/pre-commit"), "existing hook\n", "utf-8");

          await deployHuskyHook(harnessRoot, projectRoot);

          return readFile(join(projectRoot, ".husky/pre-commit"), "utf-8");
        });

        // Assert
        expect(actual).toBe("existing hook\n");
      });
    });
  });
});
