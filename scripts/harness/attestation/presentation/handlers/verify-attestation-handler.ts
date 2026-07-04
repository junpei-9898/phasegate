// @unit attestation
// @layer presentation

import type { VerifyAttestationInput } from "../../application/dto/verify-attestation-input.js";
import type { VerifyAttestationOutput } from "../../application/dto/verify-attestation-output.js";
import type { VerifyAttestationUseCase } from "../../application/usecases/verify-attestation-usecase.js";

export interface VerifyAttestationHandlerArgs {
  /** 検証対象 attestation ファイルパス（位置引数）。 */
  readonly file?: string;
  readonly emitJson?: boolean;
}

export interface VerifyAttestationHandlerResult {
  readonly output: string;
  readonly exitCode: 0 | 1 | 2;
}

/**
 * H16-02: phasegate:verify-attestation のハンドラ。
 * 位置引数 <file> + --json を解釈し UseCase を呼び、機械的 5 チェックを整形する。
 * 終了コード: 0 全合格 / 1 mismatch / 2 不在・malformed・非対応 mode。
 */
export class VerifyAttestationHandler {
  constructor(private readonly useCase: VerifyAttestationUseCase) {}

  async handle(args: VerifyAttestationHandlerArgs): Promise<VerifyAttestationHandlerResult> {
    if (!args.file || args.file.trim().length === 0) {
      return { output: "Error: <file> is required. Usage: phasegate:verify-attestation <file> [--json]", exitCode: 2 };
    }

    const input: VerifyAttestationInput = {
      filePath: args.file,
      emitJson: args.emitJson === true,
    };

    const result = await this.useCase.execute(input);

    if (input.emitJson) {
      return { output: JSON.stringify(result.output, null, 2), exitCode: result.exitCode };
    }
    return { output: renderHuman(result.output, result.exitCode), exitCode: result.exitCode };
  }
}

function mark(ok: boolean): string {
  return ok ? "PASS" : "FAIL";
}

function renderHuman(output: VerifyAttestationOutput, exitCode: 0 | 1 | 2): string {
  const c = output.checks;
  const lines: string[] = [];
  lines.push(`schema           : ${mark(c.schema)}`);
  lines.push(`mode             : ${mark(c.mode)}`);
  lines.push(`attestationDigest: ${mark(c.attestationDigest)}`);
  lines.push(`inputHashes      : ${mark(c.inputHashes)}`);
  lines.push(`granularity      : ${mark(c.granularity)}`);
  if (output.mismatches.length > 0) {
    lines.push("");
    lines.push("Mismatches:");
    for (const m of output.mismatches) {
      lines.push(`  - ${m}`);
    }
  }
  lines.push("");
  if (exitCode === 0) {
    lines.push("Result: OK (all checks passed)");
  } else if (exitCode === 1) {
    lines.push("Result: MISMATCH (attestation integrity check failed)");
  } else {
    lines.push("Result: ERROR (missing, malformed, or unsupported attestation)");
  }
  return lines.join("\n");
}
