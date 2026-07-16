// @unit harness-api
// @layer test
// @story WI-250
// @work-item-id WI-250, WI-291, WI-296

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { KNOWN_HARNESS_COMMANDS } from "../../../harness-api/domain/value-objects/known-harness-commands.js";
import { context, target } from "../../helpers/test-helpers.js";

/**
 * WI-250 conformance テスト（乖離検出ゲート）。
 * main.ts の CLI dispatch（`switch (command)`）の `case "..."` ラベル全件を実ファイルから抽出し、
 * canonical 定数 `KNOWN_HARNESS_COMMANDS` と集合一致することを検証する。
 * main.ts にコマンドを追加/削除して定数を更新し忘れると本テストが fail する。
 */

const MAIN_TS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../../main.ts");

function extractDispatchCaseLabels(source: string): readonly string[] {
  const labels: string[] = [];
  const caseLabelPattern = /^\s*case "([^"]+)":/gm;
  for (const match of source.matchAll(caseLabelPattern)) {
    labels.push(match[1]);
  }
  return labels;
}

target("KNOWN_HARNESS_COMMANDS canonical 定数", () => {
  context("main.ts の dispatch switch と突合する場合", () => {
    it("main.ts の case ラベル集合と canonical 定数が集合一致する", () => {
      // Arrange
      const source = readFileSync(MAIN_TS_PATH, "utf-8");

      // Act
      const dispatchLabels = extractDispatchCaseLabels(source);

      // Assert
      expect(dispatchLabels.length).toBeGreaterThan(0);
      expect([...new Set(dispatchLabels)].sort()).toEqual([...KNOWN_HARNESS_COMMANDS]);
    });
  });

  context("定数自体の不変条件を検証する場合", () => {
    it("エントリは重複なくソート済みである", () => {
      // Arrange
      const entries = [...KNOWN_HARNESS_COMMANDS];

      // Act
      const deduplicatedSorted = [...new Set(entries)].sort();

      // Assert
      expect(entries).toEqual(deduplicatedSorted);
    });

    it("実在コマンド phasegate:status を含む", () => {
      // Arrange
      const entries = KNOWN_HARNESS_COMMANDS;

      // Act
      const included = entries.includes("phasegate:status");

      // Assert
      expect(included).toBe(true);
    });

    it("WM-15ではworld:inspect・world:pin・world:deriveの3コマンドを公開する", () => {
      // Arrange
      const entries = KNOWN_HARNESS_COMMANDS;

      // Act
      const actual = {
        inspect: entries.includes("world:inspect"),
        pin: entries.includes("world:pin"),
        derive: entries.includes("world:derive"),
      };

      // Assert
      expect(actual).toEqual({ inspect: true, pin: true, derive: true });
    });
  });
});
