// @unit ci-governance
// @layer test
// @story WI-254
// @work-item-id WI-254

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PinIntegrityUseCase } from "../../../ci-governance/application/usecases/pin-integrity-usecase.js";
import { VerifyIntegrityUseCase } from "../../../ci-governance/application/usecases/verify-integrity-usecase.js";
import { IntegrityChecker } from "../../../ci-governance/domain/services/integrity-checker.js";
import { FileSystemSha256HasherAdapter } from "../../../ci-governance/infrastructure/adapters/file-system-sha256-hasher-adapter.js";
import { GlobFileScannerAdapter } from "../../../ci-governance/infrastructure/adapters/glob-file-scanner-adapter.js";
import { IntegrityManifestJsonRepositoryAdapter } from "../../../ci-governance/infrastructure/adapters/integrity-manifest-json-repository-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

function buildUseCases(baseDir: string) {
  const scanner = new GlobFileScannerAdapter(baseDir);
  const hasher = new FileSystemSha256HasherAdapter(baseDir);
  const repository = new IntegrityManifestJsonRepositoryAdapter(baseDir);
  const checker = new IntegrityChecker();
  return {
    pin: new PinIntegrityUseCase(scanner, hasher, repository),
    verify: new VerifyIntegrityUseCase(scanner, hasher, repository, checker),
  };
}

target("Integrity pin/verify 統合", () => {
  describe("実コーパス（skills/ 実物）に対する pin→verify", () => {
    context("実リポジトリの指示搭載ファイルを dry-run で pin する場合", () => {
      it("sha256 digest が実物から決定的に計算され SKILL.md を含む", async () => {
        // Arrange
        const { pin } = buildUseCases(rootDir);

        // Act
        const first = await pin.execute({ dryRun: true });
        const second = await pin.execute({ dryRun: true });

        // Assert
        expect(first.entryCount).toBeGreaterThan(0);
        // 決定的: 2 回計算しても同一
        expect(second.files).toEqual(first.files);
        // 対象に SKILL.md が含まれる
        expect(first.files.some((f) => f.path.endsWith("/SKILL.md"))).toBe(true);
        // digest は 64 桁 hex
        for (const f of first.files) {
          expect(f.digest).toMatch(/^[0-9a-f]{64}$/);
        }
        // path 昇順
        const paths = first.files.map((f) => f.path);
        expect(paths).toEqual([...paths].sort());
      });
    });
  });

  describe("一時ディレクトリでの drift シナリオ", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "phasegate-integrity-"));
      // 対象 glob に一致する実ファイルを用意（skills/*/SKILL.md）
      await fs.mkdir(path.join(tmpDir, "skills", "alpha"), { recursive: true });
      await fs.mkdir(path.join(tmpDir, "skills", "beta"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, "skills", "alpha", "SKILL.md"), "alpha v1\n");
      await fs.writeFile(path.join(tmpDir, "skills", "beta", "SKILL.md"), "beta v1\n");
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    context("pin 直後に verify する場合", () => {
      it("drift なし・ok=true になる", async () => {
        // Arrange
        const { pin, verify } = buildUseCases(tmpDir);
        await pin.execute();

        // Act
        const result = await verify.execute();

        // Assert
        expect(result.ok).toBe(true);
        expect(result.drifts).toEqual([]);
      });
    });

    context("pin 後にファイル内容を書き換えた場合", () => {
      it("mismatch drift が検出される", async () => {
        // Arrange
        const { pin, verify } = buildUseCases(tmpDir);
        await pin.execute();
        await fs.writeFile(path.join(tmpDir, "skills", "alpha", "SKILL.md"), "alpha TAMPERED\n");

        // Act
        const result = await verify.execute();

        // Assert
        expect(result.ok).toBe(false);
        expect(result.drifts).toEqual([{ path: "skills/alpha/SKILL.md", kind: "mismatch" }]);
      });
    });

    context("pin 後に対象ファイルを削除した場合", () => {
      it("missing drift が検出される", async () => {
        // Arrange
        const { pin, verify } = buildUseCases(tmpDir);
        await pin.execute();
        await fs.rm(path.join(tmpDir, "skills", "beta", "SKILL.md"));

        // Act
        const result = await verify.execute();

        // Assert
        expect(result.ok).toBe(false);
        expect(result.drifts).toEqual([{ path: "skills/beta/SKILL.md", kind: "missing" }]);
      });
    });

    context("pin 後に新しい対象ファイルを追加した場合", () => {
      it("added drift が検出される", async () => {
        // Arrange
        const { pin, verify } = buildUseCases(tmpDir);
        await pin.execute();
        await fs.mkdir(path.join(tmpDir, "skills", "gamma"), { recursive: true });
        await fs.writeFile(path.join(tmpDir, "skills", "gamma", "SKILL.md"), "gamma new\n");

        // Act
        const result = await verify.execute();

        // Assert
        expect(result.ok).toBe(false);
        expect(result.drifts).toEqual([{ path: "skills/gamma/SKILL.md", kind: "added" }]);
      });
    });

    context("manifest が存在しない状態で verify する場合", () => {
      it("manifest-absent drift が検出される", async () => {
        // Arrange
        const { verify } = buildUseCases(tmpDir);

        // Act
        const result = await verify.execute();

        // Assert
        expect(result.ok).toBe(false);
        expect(result.drifts).toEqual([{ path: "phasegate.integrity.json", kind: "manifest-absent" }]);
      });
    });

    context("manifest を save→load する場合", () => {
      it("version=1 / algorithm=sha256 / files が昇順で永続化される", async () => {
        // Arrange
        const { pin } = buildUseCases(tmpDir);
        await pin.execute();

        // Act
        const raw = await fs.readFile(path.join(tmpDir, "phasegate.integrity.json"), "utf-8");
        const parsed = JSON.parse(raw) as {
          version: number;
          algorithm: string;
          files: Record<string, string>;
        };

        // Assert
        expect(parsed.version).toBe(1);
        expect(parsed.algorithm).toBe("sha256");
        const keys = Object.keys(parsed.files);
        expect(keys).toEqual(["skills/alpha/SKILL.md", "skills/beta/SKILL.md"]);
        expect(raw.endsWith("\n")).toBe(true);
      });
    });
  });
});
