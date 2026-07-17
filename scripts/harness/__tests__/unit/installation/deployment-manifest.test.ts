// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145
// @work-item-id WI-326

import { describe, expect, it } from "vitest";
import { DeploymentEntry } from "../../../installation/domain/deployment-entry.js";
import { DeploymentManifest } from "../../../installation/domain/deployment-manifest.js";
import { context, target } from "../../helpers/test-helpers.js";

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

  describe("installationFlags を永続化する (WI-326)", () => {
    it("installationFlags を JSON round-trip で保持すること", () => {
      // Arrange
      const manifest = DeploymentManifest.create("0.145.0", "2026-05-11T00:00:00.000Z").withInstallationFlags({
        includeHusky: false,
        includeCi: true,
        personal: false,
      });

      // Act
      const actual = DeploymentManifest.fromJSON(manifest.toJSON());

      // Assert
      expect(actual.installationFlags).toEqual({ includeHusky: false, includeCi: true, personal: false });
    });

    it("installationFlags の無い旧 manifest JSON を fromJSON で読み込めること", () => {
      // Arrange
      const legacyJson = {
        version: "0.145.0",
        installedAt: "2026-05-11T00:00:00.000Z",
        entries: [createEntry().toJSON()],
      };

      // Act
      const actual = DeploymentManifest.fromJSON(legacyJson);

      // Assert
      expect(actual.installationFlags).toBeUndefined();
      expect(actual.entries).toHaveLength(1);
    });

    it("installationFlags の無い manifest の toJSON は installationFlags キーを含まないこと", () => {
      // Arrange
      const manifest = DeploymentManifest.create("0.145.0", "2026-05-11T00:00:00.000Z");

      // Act
      const actual = manifest.toJSON();

      // Assert
      expect("installationFlags" in actual).toBe(false);
    });

    it("addEntry と removeEntry が installationFlags を維持すること", () => {
      // Arrange
      const manifest = DeploymentManifest.create("0.145.0", "2026-05-11T00:00:00.000Z").withInstallationFlags({
        includeHusky: true,
        includeCi: false,
        personal: true,
      });

      // Act
      const actual = manifest.addEntry(createEntry()).removeEntry(".claude/settings.json");

      // Assert
      expect(actual.installationFlags).toEqual({ includeHusky: true, includeCi: false, personal: true });
    });

    it("boolean でない installationFlags は不変条件違反を返すこと", () => {
      // Arrange
      const invalidFlags = { includeHusky: "yes", includeCi: true, personal: false };

      // Act
      const actual = () =>
        DeploymentManifest.reconstitute({
          version: "0.145.0",
          installedAt: "2026-05-11T00:00:00.000Z",
          entries: [],
          installationFlags: invalidFlags as unknown as {
            includeHusky: boolean;
            includeCi: boolean;
            personal: boolean;
          },
        });

      // Assert
      expect(actual).toThrow("installationFlags");
    });
  });
});
