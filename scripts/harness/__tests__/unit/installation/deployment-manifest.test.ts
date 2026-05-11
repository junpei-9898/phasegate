// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145

import { describe, expect, it } from "vitest";
import { DeploymentEntry } from "../../../installation/domain/deployment-entry.js";
import { DeploymentManifest } from "../../../installation/domain/deployment-manifest.js";
import { target, context } from "../../helpers/test-helpers.js";

const HASH = "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";

function createEntry(path = ".claude/settings.json") {
  return DeploymentEntry.create({
    path,
    mode: "created",
    block: null,
    hash: HASH,
    deployedAt: "2026-05-11T00:00:00.000Z",
  });
}

target("DeploymentManifest", () => {
  describe("manifestを生成する", () => {
    it("semver version と一意なentryで生成されること", () => {
      // Arrange
      const entry = createEntry();

      // Act
      const actual = DeploymentManifest.reconstitute({
        version: "0.145.0",
        installedAt: "2026-05-11T00:00:00.000Z",
        entries: [entry],
      });

      // Assert
      expect(actual.version).toBe("0.145.0");
      expect(actual.entries).toHaveLength(1);
    });
  });

  context("entry path が重複する場合", () => {
    it("重複pathの不変条件違反を返すこと", () => {
      // Arrange
      const entry = createEntry();

      // Act
      const actual = () =>
        DeploymentManifest.reconstitute({
          version: "0.145.0",
          installedAt: "2026-05-11T00:00:00.000Z",
          entries: [entry, entry],
        });

      // Assert
      expect(actual).toThrow("duplicate entry path");
    });
  });

  describe("entryを差し替える", () => {
    it("同じpathのentryを重複させずに差し替えること", () => {
      // Arrange
      const manifest = DeploymentManifest.create("0.145.0", "2026-05-11T00:00:00.000Z").addEntry(createEntry());
      const replacement = createEntry();

      // Act
      const actual = manifest.addEntry(replacement);

      // Assert
      expect(actual.entries).toHaveLength(1);
      expect(actual.findEntry(".claude/settings.json")).toBe(replacement);
    });
  });
});
