// @unit attestation
// @layer infrastructure

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GateResultSourcePort, GateValidatorResult } from "../../application/ports/gate-result-source-port.js";

interface CiCheckSubprocessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * GateResultSourcePort の subprocess 実装（black-box observation）。
 * `npx tsx <main.ts> phasegate:ci-check --json` を子プロセス実行し、
 * stdout JSON の `data` から `{ allPassed, validatorResults[] }` を抽出する。
 *
 * ci-check の内部（harness-api）を import しない。gate fail でも ci-check は
 * parseable JSON（allPassed:false）を出力するため、非0 exit は即エラーとせず
 * stdout の JSON を解析する。JSON が解析不能／shape 不正のときのみ本物のクラッシュとして throw。
 */
export class CiCheckGateResultAdapter implements GateResultSourcePort {
  /** ci-check subprocess の最大待機時間（ms）。 */
  private readonly timeoutMs: number;
  /** テスト用のオーバーライド。既定は本 adapter が解決する main.ts。 */
  private readonly mainTsPath: string;

  constructor(options?: { readonly timeoutMs?: number; readonly mainTsPath?: string }) {
    this.timeoutMs = options?.timeoutMs ?? 300_000;
    this.mainTsPath = options?.mainTsPath ?? resolveMainTsPath();
  }

  async fetchGateResult(): Promise<{
    readonly allPassed: boolean;
    readonly validatorResults: readonly GateValidatorResult[];
  }> {
    const result = await this.runCiCheck();
    const parsed = this.parseResponse(result);
    return parsed;
  }

  private parseResponse(result: CiCheckSubprocessResult): {
    allPassed: boolean;
    validatorResults: GateValidatorResult[];
  } {
    const json = extractJsonObject(result.stdout);
    if (json === null) {
      throw new Error(
        `ci-check produced no parseable JSON (exit ${result.exitCode}). stderr: ${result.stderr.slice(0, 500)}`,
      );
    }
    const data = (json as Record<string, unknown>).data;
    if (typeof data !== "object" || data === null) {
      throw new Error(`ci-check JSON has no "data" field (exit ${result.exitCode})`);
    }
    const dataRecord = data as Record<string, unknown>;
    const rawValidators = dataRecord.validatorResults;
    if (!Array.isArray(rawValidators)) {
      throw new Error('ci-check JSON "data.validatorResults" is not an array');
    }
    if (typeof dataRecord.allPassed !== "boolean") {
      throw new Error('ci-check JSON "data.allPassed" is not a boolean');
    }
    const validatorResults: GateValidatorResult[] = rawValidators.map((raw, i) => {
      if (typeof raw !== "object" || raw === null) {
        throw new Error(`ci-check validatorResults[${i}] is not an object`);
      }
      const item = raw as Record<string, unknown>;
      if (typeof item.validatorId !== "string") {
        throw new Error(`ci-check validatorResults[${i}].validatorId is not a string`);
      }
      if (typeof item.passed !== "boolean") {
        throw new Error(`ci-check validatorResults[${i}].passed is not a boolean`);
      }
      return {
        validatorId: item.validatorId,
        passed: item.passed,
        skipped: typeof item.skipped === "boolean" ? item.skipped : false,
      };
    });
    return { allPassed: dataRecord.allPassed, validatorResults };
  }

  private runCiCheck(): Promise<CiCheckSubprocessResult> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn("npx", ["tsx", this.mainTsPath, "phasegate:ci-check", "--json"], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
        env: process.env,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        reject(new Error(`ci-check subprocess timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        if (!timedOut) reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        resolvePromise({ exitCode: code ?? 0, stdout, stderr });
      });
      child.stdin?.end();
    });
  }
}

function resolveMainTsPath(): string {
  // infrastructure/adapters/ から 3 階層上が scripts/harness/。
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../main.ts");
}

/**
 * stdout から最初の JSON オブジェクトを抽出する。ci-check は他ログを stdout に混ぜ得るため、
 * 各行を試し、失敗時は最初の `{` から最後の `}` までを試す。
 */
function extractJsonObject(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return null;

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const lines = trimmed.split("\n");
  for (const line of lines) {
    const candidate = line.trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      const parsed = tryParse(candidate);
      if (parsed !== undefined) return parsed;
    }
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const parsed = tryParse(trimmed.slice(first, last + 1));
    if (parsed !== undefined) return parsed;
  }
  return null;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
