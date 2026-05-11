// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145

import { describe, expect, it } from "vitest";
import { SkillDeployerManifestBuilder } from "../../../installation/application/wrappers/skill-deployer-manifest-builder.js";
import type { HashCalculatorPort } from "../../../installation/application/ports/hash-calculator-port.js";
import { Hash } from "../../../installation/domain/hash.js";
import { target } from "../../helpers/test-helpers.js";

const HASH = "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
const DEPLOYED_AT = "2026-05-11T00:00:00.000Z";

class FakeHashCalculator implements HashCalculatorPort {
  readonly inputs: string[] = [];

  compute(content: string | Buffer): Hash {
    this.inputs.push(content.toString());
    return Hash.from(HASH);
  }
}

target("SkillDeployerManifestBuilder", () => {
  describe("manifest entriesを生成する", () => {
    it("created/symlink の path/mode/hash/deployedAt を固定すること", () => {
      const hashCalculator = new FakeHashCalculator();
      const sut = new SkillDeployerManifestBuilder(hashCalculator);

      const actual = sut.build(
        "0.145.0",
        [
          { path: ".harness-version", mode: "created", contentForHash: "0.145.0\n" },
          { path: ".claude/skills", mode: "symlink", contentForHash: "../skills" },
        ],
        DEPLOYED_AT,
      );

      expect(actual.toJSON()).toEqual({
        version: "0.145.0",
        installedAt: DEPLOYED_AT,
        entries: [
          {
            path: ".harness-version",
            mode: "created",
            block: null,
            hash: HASH,
            deployedAt: DEPLOYED_AT,
          },
          {
            path: ".claude/skills",
            mode: "symlink",
            block: null,
            hash: HASH,
            deployedAt: DEPLOYED_AT,
          },
        ],
      });
      expect(hashCalculator.inputs).toEqual(["0.145.0\n", "../skills"]);
    });

    it("merged entry は managed block と一緒に保持されること", () => {
      const sut = new SkillDeployerManifestBuilder(new FakeHashCalculator());

      const actual = sut.build(
        "0.145.0",
        [
          {
            path: ".husky/pre-commit",
            mode: "merged",
            contentForHash: "phasegate block",
            block: {
              start: "# === phasegate managed (BEGIN) ===",
              end: "# === phasegate managed (END) ===",
              content: "npx phasegate lint",
            },
          },
        ],
        DEPLOYED_AT,
      );

      expect(actual.entries[0]?.toJSON()).toEqual({
        path: ".husky/pre-commit",
        mode: "merged",
        block: {
          start: "# === phasegate managed (BEGIN) ===",
          end: "# === phasegate managed (END) ===",
          content: "npx phasegate lint",
        },
        hash: HASH,
        deployedAt: DEPLOYED_AT,
      });
    });
  });
});
