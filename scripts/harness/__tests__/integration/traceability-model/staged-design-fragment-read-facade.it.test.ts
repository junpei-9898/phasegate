// @unit traceability-model
// @layer integration
// @work-item-id WI-305
// @story H17-17

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTraceabilityModelModule } from "../../../traceability-model/index.js";

let rootDir: string;

const write = async (relativePath: string, content: string): Promise<void> => {
  const absolute = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, "utf8");
};

const git = (...args: readonly string[]): void => {
  execFileSync("git", args, { cwd: rootDir, stdio: "ignore" });
};

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "staged-design-fragment-"));
  git("init");
  git("config", "user.name", "Phasegate Test");
  git("config", "user.email", "phasegate@example.test");
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("staged design fragment read facade", () => {
  it("変更fragmentだけをWork Itemとreflection付きplain DTOで返すこと", async () => {
    // Arrange
    const file = "docs/product/construction/agent-integration/logical_design.md";
    const before = [
      "<!-- @world-fragment-id agent-integration.first -->",
      "<!-- @work-item-id WI-100 -->",
      "## First",
      "before",
      "<!-- @world-fragment-id agent-integration.second -->",
      "<!-- @world-reflects inception:agent-integration.second -->",
      "<!-- @work-item-id WI-305 -->",
      "## Second",
      "before",
      "",
    ].join("\n");
    await write(file, before);
    git("add", file);
    git("commit", "-m", "fixture");
    await write(file, before.replace("## Second\nbefore", "## Renamed heading\nafter"));
    git("add", file);

    // Act
    const actual = await createTraceabilityModelModule(rootDir).designChangeReadFacade.observe([file]);

    // Assert
    expect(actual).toEqual({
      state: "available",
      fragments: [
        {
          corpusRole: "product",
          declaredKey: "agent-integration.second",
          path: file,
          changeKind: "modified",
          workItemIds: ["WI-305"],
          reflectionTargets: ["inception:agent-integration.second"],
        },
      ],
      diagnostics: [],
    });
  });

  it("削除fragmentをHEAD baselineから観測すること", async () => {
    // Arrange
    const file = "docs/inception/_cross/WI-305/logical_design.md";
    await write(
      file,
      [
        "<!-- @world-fragment-id agent-integration.design-change-declaration -->",
        "<!-- @work-item-id WI-305 -->",
        "## Design declaration",
        "body",
        "",
      ].join("\n"),
    );
    git("add", file);
    git("commit", "-m", "fixture");
    git("rm", file);

    // Act
    const actual = await createTraceabilityModelModule(rootDir).designChangeReadFacade.observe([file]);

    // Assert
    expect(actual).toEqual({
      state: "available",
      fragments: [
        {
          corpusRole: "inception",
          declaredKey: "agent-integration.design-change-declaration",
          path: file,
          changeKind: "deleted",
          workItemIds: ["WI-305"],
          reflectionTargets: [],
        },
      ],
      diagnostics: [],
    });
  });

  it("heading直前でないorphan markerをsilent fact化しないこと", async () => {
    // Arrange
    const file = "docs/product/construction/agent-integration/logical_design.md";
    await write(file, "# Baseline\n");
    git("add", file);
    git("commit", "-m", "fixture");
    await write(file, ["<!-- @world-fragment-id agent-integration.orphan -->", "", "## Orphan", "body", ""].join("\n"));
    git("add", file);

    // Act
    const actual = await createTraceabilityModelModule(rootDir).designChangeReadFacade.observe([file]);

    // Assert
    expect(actual).toEqual({
      state: "unavailable",
      diagnostics: [{ code: "invalid-staged-fragment-prelude", path: file }],
    });
  });
});
