// @unit attestation
// @layer test
// @story H16-01

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { CiCheckGateResultAdapter } from "../../../attestation/infrastructure/adapters/ci-check-gate-result-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const REAL_MAIN_TS = path.join(REPO_ROOT, "scripts/harness/main.ts");

let tmpDirs: string[] = [];

const createTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "attest-cicheck-"));
  tmpDirs.push(dir);
  return dir;
};

/**
 * ci-check の --json 出力を模した固定 JSON を stdout に出す最小スクリプトを書き出し、
 * その絶対パスを返す。adapter は `npx tsx <path> phasegate:ci-check --json` を実行するため
 * スクリプトは引数を無視して JSON を吐くだけでよい。実 subprocess + 実 parse を検証する。
 */
const writeFakeCiCheckScript = (dir: string, payload: object): string => {
  const scriptPath = path.join(dir, "fake-ci-check.ts");
  const body = `const response = ${JSON.stringify(payload)};\nprocess.stdout.write(JSON.stringify(response) + "\\n");\n`;
  fs.writeFileSync(scriptPath, body);
  return scriptPath;
};

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

target("CiCheckGateResultAdapter", () => {
  context("ci-check --json の pass 応答（fake subprocess）を解析する場合", () => {
    it("data.allPassed と data.validatorResults を抽出すること", async () => {
      // Arrange
      const dir = createTmpDir();
      const payload = {
        status: "pass",
        errors: [],
        summary: { totalChecks: 1, passed: 1, failed: 0, warnings: 0 },
        data: {
          validatorResults: [
            { validatorId: "L3-001", passed: true, skipped: false, errors: [] },
            { validatorId: "L3-002", passed: true, skipped: true, errors: [] },
          ],
          allPassed: true,
        },
      };
      const scriptPath = writeFakeCiCheckScript(dir, payload);
      const adapter = new CiCheckGateResultAdapter({ mainTsPath: scriptPath, timeoutMs: 60_000 });

      // Act
      const result = await adapter.fetchGateResult();

      // Assert
      expect(result.allPassed).toBe(true);
      expect(result.validatorResults).toEqual([
        { validatorId: "L3-001", passed: true, skipped: false },
        { validatorId: "L3-002", passed: true, skipped: true },
      ]);
    }, 90_000);
  });

  context("ci-check が fail 応答（allPassed:false）を返す場合", () => {
    it("エラーとせず allPassed:false と validatorResults を抽出すること", async () => {
      // Arrange
      const dir = createTmpDir();
      const payload = {
        status: "fail",
        data: {
          validatorResults: [{ validatorId: "L3-004", passed: false, skipped: false, errors: [] }],
          allPassed: false,
        },
      };
      const scriptPath = writeFakeCiCheckScript(dir, payload);
      const adapter = new CiCheckGateResultAdapter({ mainTsPath: scriptPath, timeoutMs: 60_000 });

      // Act
      const result = await adapter.fetchGateResult();

      // Assert
      expect(result.allPassed).toBe(false);
      expect(result.validatorResults).toEqual([{ validatorId: "L3-004", passed: false, skipped: false }]);
    }, 90_000);
  });

  context("skipped フィールドが欠落している場合", () => {
    it("skipped を false に正規化すること", async () => {
      // Arrange
      const dir = createTmpDir();
      const payload = {
        data: {
          validatorResults: [{ validatorId: "L2-001", passed: true }],
          allPassed: true,
        },
      };
      const scriptPath = writeFakeCiCheckScript(dir, payload);
      const adapter = new CiCheckGateResultAdapter({ mainTsPath: scriptPath, timeoutMs: 60_000 });

      // Act
      const result = await adapter.fetchGateResult();

      // Assert
      expect(result.validatorResults[0]).toEqual({ validatorId: "L2-001", passed: true, skipped: false });
    }, 90_000);
  });

  context("実 main.ts の phasegate:ci-check --json を実行する場合", () => {
    it("実 subprocess 出力から allPassed と 1件以上の validatorResults を抽出すること", async () => {
      // Arrange
      const adapter = new CiCheckGateResultAdapter({ mainTsPath: REAL_MAIN_TS, timeoutMs: 300_000 });

      // Act
      const result = await adapter.fetchGateResult();

      // Assert
      expect(typeof result.allPassed).toBe("boolean");
      expect(result.validatorResults.length).toBeGreaterThan(0);
      for (const v of result.validatorResults) {
        expect(typeof v.validatorId).toBe("string");
        expect(v.validatorId.length).toBeGreaterThan(0);
        expect(typeof v.passed).toBe("boolean");
        expect(typeof v.skipped).toBe("boolean");
      }
    }, 300_000);
  });
});
