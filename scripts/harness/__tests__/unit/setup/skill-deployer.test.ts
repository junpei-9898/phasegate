// @unit harness-api
// @layer test
// @story H13-04
import { access, lstat, mkdir, mkdtemp, readFile, readlink, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  deployAgentSkillLinks,
  deployDesignDocs,
  deployHuskyCommitMsgHook,
  deployHuskyHook,
  deploySkills,
  initHarnessConfig,
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
