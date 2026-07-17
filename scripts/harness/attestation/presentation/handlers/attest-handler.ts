// @unit attestation
// @layer presentation
// @work-item-id WI-306

import type { ProduceAttestationInput } from "../../application/dto/produce-attestation-input.js";
import type { ProduceAttestationUseCase } from "../../application/usecases/produce-attestation-usecase.js";
import type { SignatureMode } from "../../domain/value-objects/signature-block.js";

export interface AttestHandlerArgs {
  /** record 出力先。既定は presentation 呼び出し側で `.harness/attestation.json`。 */
  readonly out?: string;
  readonly requirePass?: boolean;
  readonly emitJson?: boolean;
  /** 署名モード（既定 unsigned-poc）。`signed` は not-yet-implemented。 */
  readonly mode?: string;
}

export interface AttestHandlerResult {
  readonly output: string;
  readonly exitCode: 0 | 1 | 2;
}

const DEFAULT_OUT = ".harness/attestation.json";

/**
 * H16-01: phasegate:attest の CLI ハンドラ。
 * flags を ProduceAttestationInput に解釈し UseCase を呼び、output + exitCode に整形する。
 * 終了コード: 0 成功 / 1 --require-pass 下で gate fail / 2 usage error（未知 mode・signed）。
 */
export class AttestHandler {
  constructor(private readonly useCase: ProduceAttestationUseCase) {}

  async handle(args: AttestHandlerArgs): Promise<AttestHandlerResult> {
    const rawMode = args.mode ?? "unsigned-poc";
    if (rawMode !== "unsigned-poc" && rawMode !== "signed") {
      return { output: `Error: unknown --mode "${rawMode}" (expected unsigned-poc | signed)`, exitCode: 2 };
    }
    const mode: SignatureMode = rawMode;

    const input: ProduceAttestationInput = {
      out: args.out && args.out.length > 0 ? args.out : DEFAULT_OUT,
      requirePass: args.requirePass === true,
      emitJson: args.emitJson === true,
      mode,
    };

    const result = await this.useCase.execute(input);

    if (result.exitCode === 2) {
      const output = result.error
        ? `Error: ${result.error}`
        : 'Error: --mode "signed" is not yet implemented (only unsigned-poc is supported)';
      return { output, exitCode: 2 };
    }

    if (result.exitCode === 1) {
      return {
        output: 'Gate result is not "pass"; --require-pass suppressed attestation output.',
        exitCode: 1,
      };
    }

    // exitCode 0: 生成成功
    if (result.document === null) {
      // 型上は起こり得ないが安全側で扱う。
      return { output: "Error: attestation produced no document.", exitCode: 2 };
    }

    if (input.emitJson) {
      return { output: JSON.stringify(result.document, null, 2), exitCode: 0 };
    }
    return { output: `Attestation written to ${input.out}`, exitCode: 0 };
  }
}
